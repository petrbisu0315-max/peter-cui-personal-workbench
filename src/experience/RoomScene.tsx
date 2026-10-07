import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF, useProgress, useTexture } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import type { ActiveHotspot } from '../interactionState'
import type { LightingMode } from '../lighting'
import type { HotspotId } from '../types/content'
import type { BackgroundThemeId } from '../themes'
import { BACKGROUND_THEMES } from '../themes'
import { AccentLights, type LightingMix, lightsOn } from './AccentLights'
import { EnvironmentBackground } from './EnvironmentBackground'
import { useReducedMotion } from '../useReducedMotion'
import { hotspotFromObjectName, hotspotMeta } from './hotspots'
import { RoomDecor } from './RoomDecor'
import { createGlowTexture } from './surfaces'
import resumeDocument from '../data/resume.json'

type SceneProps = {
  entered: boolean
  active: ActiveHotspot | null
  lighting: LightingMode
  theme: BackgroundThemeId
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

// The résumé prop in the props GLB is a flat mockup: a paper base plus printed header,
// rules and an accent bar. Those printed parts are replaced by a page of the real PDF.
const RESUME_MOCKUP_PATTERN = /^(Resume_Header|Resume_Line_\d|Resume_Accent)$/i
const RESUME_SLOT_NAME = 'SLOT_Resume'
const RESUME_PAPER_NAME = 'Resume_PaperThumbnail'
// Footprint of the Resume_Base mesh, in local units.
const RESUME_PAPER_WIDTH = 0.58
const RESUME_PAPER_HEIGHT = 0.4
// Resume_Base is 0.025 thick, so its upper face sits at +0.0125.
const RESUME_PAPER_LIFT = 0.0135
const focusSettings: Record<HotspotId, { distance: number; yOffset: number }> = {
  resume: { distance: 1.82, yOffset: 0.24 },
  experience: { distance: 1.92, yOffset: 0.26 },
  research: { distance: 1.76, yOffset: 0.12 },
  projects: { distance: 1.68, yOffset: 0.12 },
  photos: { distance: 1.92, yOffset: 0.16 },
  books: { distance: 2.08, yOffset: 0.15 },
  movies: { distance: 2.38, yOffset: 0.14 },
  whiteboard: { distance: 2.52, yOffset: 0.12 },
  gallery: { distance: 1.92, yOffset: 0.16 },
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

function RoomModel({ lighting, theme, mix, onSelect, onToggleLamp, onLampMeasured }: Pick<SceneProps, 'lighting' | 'theme' | 'onSelect' | 'onToggleLamp'> & {
  mix: LightingMix
  onLampMeasured: (rig: LampRig | null) => void
}) {
  const main = useGLTF(MODEL_URL, '/draco/')
  const props = useGLTF(PROPS_URL)
  const resumePaper = useTexture(resumeDocument.paperImage)
  const [hovered, setHoveredState] = useState<SceneTarget | null>(null)
  const pressStart = useRef<{ x: number; y: number; key: string } | null>(null)

  useEffect(() => {
    resumePaper.colorSpace = THREE.SRGBColorSpace
    resumePaper.anisotropy = 8
    resumePaper.needsUpdate = true
  }, [resumePaper])

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
        // Keep the blank paper base, drop the printed mockup that the real page replaces.
        if (RESUME_MOCKUP_PATTERN.test(object.name)) {
          object.visible = false
          object.raycast = () => undefined
        }
        if (Array.isArray(object.material)) object.material = object.material.map((material) => material.clone())
        else object.material = object.material.clone()
      })
    })
    const resumeSlot = interactionProps.getObjectByName(RESUME_SLOT_NAME)
    if (resumeSlot) {
      const paper = new THREE.Mesh(
        new THREE.PlaneGeometry(RESUME_PAPER_WIDTH, RESUME_PAPER_HEIGHT),
        new THREE.MeshStandardMaterial({ map: resumePaper, roughness: 0.94, metalness: 0 }),
      )
      paper.name = RESUME_PAPER_NAME
      // The base lies in the local XZ plane, so the page has to be laid flat to match it.
      paper.rotation.x = -Math.PI / 2
      paper.position.set(0, RESUME_PAPER_LIFT, 0)
      paper.castShadow = false
      paper.receiveShadow = false
      resumeSlot.add(paper)
    }
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
  }, [main.scene, props.scene, resumePaper])

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
        <AccentLights mix={mix} rightWindow={theme === 'home'} />
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

function useLightingMix(mode: LightingMode): LightingMix {
  const mix = useRef({ value: mode === 'night' ? 1 : 0 })
  const reduced = useReducedMotion()
  useEffect(() => {
    const target = mode === 'night' ? 1 : 0
    const startValue = mix.current.value
    if (reduced || startValue === target) {
      mix.current.value = target
      return
    }
    // Use elapsed time so a slow renderer cannot stretch a one-second fade into minutes.
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - started) / 1100))
      mix.current.value = THREE.MathUtils.lerp(startValue, target, t * t * (3 - 2 * t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mode, reduced])
  return mix
}

function LightingSystem({
  mix,
  lamp,
  theme,
}: {
  mix: LightingMix
  lamp: LampRig | null
  theme: BackgroundThemeId
}) {
  const scene = useThree((state) => state.scene)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const key = useRef<THREE.DirectionalLight>(null!)
  const fill = useRef<THREE.DirectionalLight>(null!)
  const eveningBounce = useRef<THREE.DirectionalLight>(null!)
  const spot = useRef<THREE.SpotLight>(null)
  const bulb = useRef<THREE.PointLight>(null)
  const glow = useRef<THREE.Sprite>(null)
  const fog = useMemo(() => new THREE.Fog('#ddd9cf', 20, 60), [])
  const glowTexture = useMemo(createGlowTexture, [])
  const reduced = useReducedMotion()
  const nightColor = useMemo(() => new THREE.Color(), [])

  const targetBg = useMemo(() => new THREE.Color(), [])
  const targetHemiSky = useMemo(() => new THREE.Color(), [])
  const targetHemiGround = useMemo(() => new THREE.Color(), [])
  const targetKeyColor = useMemo(() => new THREE.Color(), [])
  const targetFillColor = useMemo(() => new THREE.Color(), [])
  const keyPosition = useMemo(() => new THREE.Vector3(theme === 'home' ? 4 : -4, 8, 5), [theme])

  useEffect(() => {
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [fog, scene])

  useEffect(() => () => glowTexture.dispose(), [glowTexture])

  useEffect(() => {
    if (!spot.current || !lamp) return
    spot.current.target.position.copy(lamp.target)
    spot.current.target.updateMatrixWorld()
  }, [lamp])

  useFrame((_, delta) => {
    const { palette: p, night: n } = BACKGROUND_THEMES[theme]
    const t = mix.current.value
    const lerp = THREE.MathUtils.lerp
    const blend = (out: THREE.Color, day: string, night: string) => out.set(day).lerp(nightColor.set(night), t)
    blend(targetBg, p.background, n.background)
    blend(targetHemiSky, p.hemiSky, n.hemiSky)
    blend(targetHemiGround, p.hemiGround, n.hemiGround)
    blend(targetKeyColor, p.keyColor, n.keyColor)
    blend(targetFillColor, p.fillColor, n.fillColor)

    const lerpRate = reduced ? 1 : 1 - Math.exp(-Math.max(0, delta) * 3.5)
    fog.color.lerp(targetBg, lerpRate)
    hemi.current.color.lerp(targetHemiSky, lerpRate)
    hemi.current.groundColor.lerp(targetHemiGround, lerpRate)
    hemi.current.intensity = lerp(hemi.current.intensity, lerp(p.hemiIntensity, n.hemiIntensity, t), lerpRate)
    key.current.position.lerp(keyPosition, lerpRate)
    key.current.color.lerp(targetKeyColor, lerpRate)
    key.current.intensity = lerp(key.current.intensity, lerp(p.keyIntensity, n.keyIntensity, t), lerpRate)
    fill.current.color.lerp(targetFillColor, lerpRate)
    fill.current.intensity = lerp(fill.current.intensity, lerp(p.fillIntensity, n.fillIntensity, t), lerpRate)
    eveningBounce.current.intensity = 0.5 * t

    const on = lightsOn(t)
    const lampMultiplier = lerp(p.lampMultiplier, n.lampMultiplier, t)
    if (spot.current) {
      spot.current.color.set(n.lampWarmth)
      spot.current.intensity = 4.8 * lampMultiplier * on
    }
    if (bulb.current) {
      bulb.current.color.set(n.lampWarmth)
      bulb.current.intensity = 0.6 * lampMultiplier * on
    }
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

export function RoomScene({
  entered,
  active,
  lighting,
  theme,
  onSelect,
  onToggleLamp,
  onFocusComplete,
}: SceneProps) {
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
        <LightingSystem mix={mix} lamp={lamp} theme={theme} />
        <EnvironmentBackground theme={theme} mix={mix} />
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <RoomModel
              lighting={lighting}
              theme={theme}
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
