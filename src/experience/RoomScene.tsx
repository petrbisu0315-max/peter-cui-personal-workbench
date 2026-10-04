import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import type { ActiveHotspot } from '../interactionState'
import type { LightingMode } from '../lighting'
import type { HotspotId } from '../types/content'
import { AccentLights, type LightingMix, lightsOn } from './AccentLights'
import { hotspotFromObjectName, hotspotMeta } from './hotspots'
import { RoomDecor } from './RoomDecor'
import { createGlowTexture } from './surfaces'

type SceneProps = {
  entered: boolean
  active: ActiveHotspot | null
  lighting: LightingMode
  onSelect: (id: HotspotId, point: THREE.Vector3) => void
  onToggleLamp: () => void
  onFocusComplete: (id: HotspotId) => void
}

type SceneTarget =
  | { kind: 'hotspot'; id: HotspotId; root: THREE.Object3D }
  | { kind: 'lamp'; root: THREE.Object3D }

type LampRig = { head: THREE.Vector3; target: THREE.Vector3; height: number }

const DESK_LAMP_PATTERN = /PROP_DeskLamp/i
const LAMP_PATTERN = /PROP_DeskLamp|ACCENT_FloorLamp/i

const MODEL_URL = '/models/peter-hero-current-safe.glb'
const PROPS_URL = '/models/peter-interaction-props.glb'
const focusSettings: Record<HotspotId, { distance: number; yOffset: number }> = {
  resume: { distance: 1.82, yOffset: 0.24 },
  experience: { distance: 1.92, yOffset: 0.26 },
  research: { distance: 1.76, yOffset: 0.12 },
  projects: { distance: 1.68, yOffset: 0.12 },
  photos: { distance: 1.92, yOffset: 0.16 },
  books: { distance: 2.08, yOffset: 0.15 },
  movies: { distance: 2.38, yOffset: 0.14 },
  whiteboard: { distance: 2.52, yOffset: 0.12 },
}

function LoadingRoomOverlay() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="model-loader-overlay" aria-live="polite">
      <div className="model-loader" role="status">
        <span>{Math.round(progress).toString().padStart(2, '0')}%</span>
        <i><b style={{ transform: `scaleX(${progress / 100})` }} /></i>
        <small>Preparing the workbench</small>
      </div>
    </div>
  )
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('3D scene failed', error, info) }
  render() {
    if (this.state.failed) {
      return (
        <Html center>
          <div className="scene-error">
            <strong>The room could not be loaded.</strong>
            <span>Use the object index below to browse the portfolio.</span>
          </div>
        </Html>
      )
    }
    return this.props.children
  }
}

function findTarget(object: THREE.Object3D): SceneTarget | null {
  let current: THREE.Object3D | null = object
  while (current) {
    const id = hotspotFromObjectName(current.name)
    if (id) return { kind: 'hotspot', id, root: current }
    if (LAMP_PATTERN.test(current.name)) return { kind: 'lamp', root: current }
    current = current.parent
  }
  return null
}

function findTargetInEvent(event: Pick<ThreeEvent<PointerEvent>, 'intersections' | 'object'>) {
  for (const intersection of event.intersections) {
    const target = findTarget(intersection.object)
    if (target) return target
  }
  return findTarget(event.object)
}

function targetKey(target: SceneTarget) {
  return target.kind === 'lamp' ? 'lamp' : target.id
}

// The lamp is a single mesh, so the shade is located from the top slice of its decoded vertices.
function measureLamp(room: THREE.Object3D, scale: number, offset: THREE.Vector3): LampRig | null {
  let lamp: THREE.Mesh | null = null
  room.traverse((object) => {
    if (!lamp && object instanceof THREE.Mesh && DESK_LAMP_PATTERN.test(object.name)) lamp = object
  })
  if (!lamp) return null
  const mesh: THREE.Mesh = lamp
  room.updateMatrixWorld(true)
  const positions = mesh.geometry.getAttribute('position')
  if (!positions) return null
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox!
  const threshold = box.min.y + (box.max.y - box.min.y) * 0.78
  const sum = new THREE.Vector3()
  const vertex = new THREE.Vector3()
  let count = 0
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index)
    if (vertex.y < threshold) continue
    sum.add(vertex)
    count += 1
  }
  if (!count) return null
  const toScene = (point: THREE.Vector3) => mesh.localToWorld(point).multiplyScalar(scale).add(offset)
  const worldBox = new THREE.Box3().setFromObject(mesh)
  const height = (worldBox.max.y - worldBox.min.y) * scale
  const head = toScene(sum.divideScalar(count))
  head.y -= height * 0.08
  const base = toScene(new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2))
  const target = new THREE.Vector3(head.x, base.y, head.z)
  return { head, target, height }
}

function setHovered(root: THREE.Object3D, hovered: boolean) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial) || material.userData.noHover) return
      const store = material.userData as { hoverColor?: number; hoverIntensity?: number }
      if (hovered) {
        if (store.hoverColor === undefined) store.hoverColor = material.emissive.getHex()
        if (store.hoverIntensity === undefined) store.hoverIntensity = material.emissiveIntensity
        material.emissive.setHex(0x7b3f2b)
        material.emissiveIntensity = 0.42
      } else {
        material.emissive.setHex(store.hoverColor ?? 0)
        material.emissiveIntensity = store.hoverIntensity ?? 1
      }
      material.needsUpdate = true
    })
  })
}

function RoomModel({ lighting, mix, onSelect, onToggleLamp, onLampMeasured }: Pick<SceneProps, 'lighting' | 'onSelect' | 'onToggleLamp'> & {
  mix: LightingMix
  onLampMeasured: (rig: LampRig | null) => void
}) {
  const main = useGLTF(MODEL_URL, '/draco/')
  const props = useGLTF(PROPS_URL)
  const [hovered, setHoveredState] = useState<SceneTarget | null>(null)
  const pressStart = useRef<{ x: number; y: number; key: string } | null>(null)

  const prepared = useMemo(() => {
    const room = main.scene.clone(true)
    const interactionProps = props.scene.clone(true)
    ;[room, interactionProps].forEach((scene) => {
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.castShadow = true
        object.receiveShadow = true
        // Wall and floor are dropped; the old landscape canvas bars are replaced by the portrait whiteboard.
        if (/^(ENV_BackWall|ENV_Floor|PROP_CanvasTop|PROP_CanvasBottom)$/i.test(object.name)) {
          object.visible = false
          object.receiveShadow = false
          object.raycast = () => undefined
          return
        }
        if (/^(PROP_PosterOrbit|PROP_PosterTitle|SLOT_InterstellarPoster|SLOT_BlankCanvas)$/i.test(object.name)) object.visible = false
        if (/^(PROP_Bookshelf|PROP_Book_0[1-5]|PROP_Speaker_GLB)$/i.test(object.name)) object.visible = false
        if (Array.isArray(object.material)) object.material = object.material.map((material) => material.clone())
        else object.material = object.material.clone()
      })
    })
    const roomBounds = new THREE.Box3().setFromObject(room)
    const size = roomBounds.getSize(new THREE.Vector3())
    const center = roomBounds.getCenter(new THREE.Vector3())
    const scale = 7.5 / Math.max(size.x, size.y, size.z)
    const position = new THREE.Vector3(-center.x * scale, -center.y * scale + 0.05, -center.z * scale)
    return {
      room,
      interactionProps,
      scale,
      position,
      lamp: measureLamp(room, scale, position),
    }
  }, [main.scene, props.scene])

  useEffect(() => {
    onLampMeasured(prepared.lamp)
  }, [onLampMeasured, prepared.lamp])

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
    return () => { document.body.style.cursor = '' }
  }, [hovered])

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const next = findTargetInEvent(event)
    if (next) event.stopPropagation()
    if (next?.root === hovered?.root) return
    if (hovered) setHovered(hovered.root, false)
    if (next) setHovered(next.root, true)
    setHoveredState(next)
  }

  const clearHover = () => {
    if (hovered) setHovered(hovered.root, false)
    setHoveredState(null)
  }

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    const target = findTargetInEvent(event)
    pressStart.current = target
      ? { x: event.clientX, y: event.clientY, key: targetKey(target) }
      : null
  }

  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    const started = pressStart.current
    pressStart.current = null
    if (!started) return
    const target = findTargetInEvent(event)
    if (!target || targetKey(target) !== started.key) return
    const movement = Math.hypot(event.clientX - started.x, event.clientY - started.y)
    if (movement > 8) return
    event.stopPropagation()
    // The lamp toggles only here: click also fires after pointerup and would toggle it back.
    if (target.kind === 'lamp') {
      onToggleLamp()
      return
    }
    const point = new THREE.Box3().setFromObject(target.root).getCenter(new THREE.Vector3())
    onSelect(target.id, point)
  }

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    const target = findTargetInEvent(event)
    if (!target) return
    event.stopPropagation()
    if (target.kind === 'lamp') return
    const point = new THREE.Box3().setFromObject(target.root).getCenter(new THREE.Vector3())
    onSelect(target.id, point)
  }

  return (
    <>
      <group
        scale={prepared.scale}
        position={prepared.position}
        onPointerMove={onPointerMove}
        onPointerOut={clearHover}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pressStart.current = null }}
        onClick={onClick}
      >
        <primitive object={prepared.room} />
        <primitive object={prepared.interactionProps} />
        <AccentLights mix={mix} />
        <RoomDecor />
      </group>
      {hovered && (
        <Html
          center
          position={new THREE.Box3().setFromObject(hovered.root).getCenter(new THREE.Vector3())}
          style={{ pointerEvents: 'none' }}
        >
          <div className="hotspot-tooltip">
            {hovered.kind === 'lamp' ? (
              <>
                <span>{lighting === 'night' ? 'ON' : 'OFF'}</span>
                {lighting === 'night' ? 'Turn the lamp off' : 'Turn the lamp on'}
              </>
            ) : (
              <>
                <span>{hotspotMeta[hovered.id].index}</span>
                {hotspotMeta[hovered.id].hoverLabel}
              </>
            )}
          </div>
        </Html>
      )}
    </>
  )
}

function CameraRig({ active, entered, onFocusComplete }: Pick<SceneProps, 'active' | 'entered' | 'onFocusComplete'>) {
  const { camera } = useThree()
  const controls = useRef<any>(null)
  const overview = useMemo(() => ({
    position: new THREE.Vector3(0.72, 0.52, 8.45),
    target: new THREE.Vector3(0.3, -0.42, 0),
  }), [])
  useEffect(() => {
    if (!entered || !controls.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 0.01 : 1.05
    const target = active?.point?.clone() ?? overview.target.clone()
    let nextPosition = overview.position.clone()
    if (active?.point) {
      const setting = focusSettings[active.id]
      const direction = camera.position.clone().sub(active.point).normalize()
      nextPosition = active.point.clone().add(direction.multiplyScalar(setting.distance))
      nextPosition.y += setting.yOffset
    }
    controls.current.enabled = !active
    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(controls.current.target)
    gsap.to(camera.position, { x: nextPosition.x, y: nextPosition.y, z: nextPosition.z, duration, ease: 'power3.inOut' })
    gsap.to(controls.current.target, {
      x: target.x, y: target.y, z: target.z, duration, ease: 'power3.inOut',
      onUpdate: () => controls.current?.update(),
      onComplete: () => {
        if (active?.point) onFocusComplete(active.id)
      },
    })
  }, [active, camera, entered, onFocusComplete, overview])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={1.2}
      maxDistance={11}
      minPolarAngle={Math.PI * 0.22}
      maxPolarAngle={Math.PI * 0.72}
      target={overview.target}
    />
  )
}

const palettes = {
  day: {
    background: new THREE.Color('#d8d4cd'),
    hemiSky: new THREE.Color('#fff6ea'),
    hemiGround: new THREE.Color('#857b70'),
    hemi: 2.25,
    key: 2.7,
    keyColor: new THREE.Color('#fff1df'),
    fill: 1.1,
    fillColor: new THREE.Color('#dfe8f5'),
  },
  // Broad evening fill keeps furniture legible; practical lamps provide warmer accents.
  night: {
    background: new THREE.Color('#514940'),
    hemiSky: new THREE.Color('#ead8bd'),
    hemiGround: new THREE.Color('#91847b'),
    hemi: 1.25,
    key: 0.8,
    keyColor: new THREE.Color('#f5ddbc'),
    fill: 0.7,
    fillColor: new THREE.Color('#c2cce0'),
  },
} as const

export function useLightingMix(mode: LightingMode): LightingMix {
  const mix = useRef({ value: mode === 'night' ? 1 : 0 })
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.to(mix.current, {
      value: mode === 'night' ? 1 : 0,
      duration: reduced ? 0.01 : 1.4,
      ease: 'power2.inOut',
      overwrite: true,
    })
  }, [mode])
  return mix
}

function LightingSystem({ mix, lamp }: { mix: LightingMix; lamp: LampRig | null }) {
  const scene = useThree((state) => state.scene)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const key = useRef<THREE.DirectionalLight>(null!)
  const fill = useRef<THREE.DirectionalLight>(null!)
  const eveningBounce = useRef<THREE.DirectionalLight>(null!)
  const spot = useRef<THREE.SpotLight>(null)
  const bulb = useRef<THREE.PointLight>(null)
  const glow = useRef<THREE.Sprite>(null)
  const background = useMemo(() => new THREE.Color(), [])
  const fog = useMemo(() => new THREE.Fog('#d8d4cd', 10.5, 19), [])
  const glowTexture = useMemo(createGlowTexture, [])

  useEffect(() => {
    scene.background = background
    scene.fog = fog
    return () => {
      scene.background = null
      scene.fog = null
    }
  }, [background, fog, scene])

  useEffect(() => () => glowTexture.dispose(), [glowTexture])

  useEffect(() => {
    if (!spot.current || !lamp) return
    spot.current.target.position.copy(lamp.target)
    spot.current.target.updateMatrixWorld()
  }, [lamp])

  useFrame(() => {
    const t = mix.current.value
    const { day, night } = palettes
    const lerp = THREE.MathUtils.lerp
    background.copy(day.background).lerp(night.background, t)
    fog.color.copy(background)
    hemi.current.color.copy(day.hemiSky).lerp(night.hemiSky, t)
    hemi.current.groundColor.copy(day.hemiGround).lerp(night.hemiGround, t)
    hemi.current.intensity = lerp(day.hemi, night.hemi, t)
    key.current.intensity = lerp(day.key, night.key, t)
    key.current.color.copy(day.keyColor).lerp(night.keyColor, t)
    fill.current.intensity = lerp(day.fill, night.fill, t)
    fill.current.color.copy(day.fillColor).lerp(night.fillColor, t)
    eveningBounce.current.intensity = 0.65 * t
    const on = lightsOn(t)
    // Shadow casting stays enabled so toggling never forces a shader recompile.
    if (spot.current) spot.current.intensity = 4.8 * on
    if (bulb.current) bulb.current.intensity = 0.6 * on
    if (glow.current) {
      glow.current.visible = on > 0.01
      ;(glow.current.material as THREE.SpriteMaterial).opacity = 0.15 * on
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fffaf1', '#7d7f7b', 2.7]} />
      <directionalLight
        ref={key}
        position={[-4, 8, 5]}
        intensity={2.7}
        color="#fff1df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0003}
      />
      <directionalLight ref={fill} position={[5, 3, -4]} intensity={1.35} color="#dce8ff" />
      <directionalLight ref={eveningBounce} position={[4, 2, 6]} intensity={0} color="#eee3d3" />
      {lamp && (
        <>
          <spotLight
            ref={spot}
            position={lamp.head}
            angle={Math.PI * 0.3}
            penumbra={0.75}
            intensity={0}
            distance={lamp.height * 4}
            decay={1.6}
            color="#ffd9a3"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0004}
          />
          <pointLight ref={bulb} position={lamp.head} intensity={0} distance={lamp.height * 2.6} decay={2} color="#ffc98a" />
          <sprite ref={glow} position={lamp.head} scale={lamp.height * 0.9} visible={false} raycast={() => null}>
            <spriteMaterial map={glowTexture} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        </>
      )}
    </>
  )
}

export function RoomScene({ entered, active, lighting, onSelect, onToggleLamp, onFocusComplete }: SceneProps) {
  const [lamp, setLamp] = useState<LampRig | null>(null)
  const mix = useLightingMix(lighting)
  return (
    <>
      <Canvas
        className="room-canvas"
        camera={{ fov: 38, near: 0.01, far: 100, position: [0.72, 0.52, 8.45] }}
        dpr={[1, window.innerWidth < 720 ? 1.25 : 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows
        onPointerMissed={() => undefined}
      >
        <LightingSystem mix={mix} lamp={lamp} />
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <RoomModel
              lighting={lighting}
              mix={mix}
              onSelect={onSelect}
              onToggleLamp={onToggleLamp}
              onLampMeasured={setLamp}
            />
          </Suspense>
        </SceneErrorBoundary>
        <CameraRig active={active} entered={entered} onFocusComplete={onFocusComplete} />
      </Canvas>
      <LoadingRoomOverlay />
    </>
  )
}

useGLTF.preload(MODEL_URL, '/draco/')
useGLTF.preload(PROPS_URL)
