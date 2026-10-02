import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import type { ActiveHotspot } from '../interactionState'
import type { HotspotId } from '../types/content'
import { hotspotFromObjectName, hotspotMeta } from './hotspots'

type SceneProps = {
  entered: boolean
  active: ActiveHotspot | null
  onSelect: (id: HotspotId, point: THREE.Vector3) => void
  onFocusComplete: (id: HotspotId) => void
}

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

function findHotspot(object: THREE.Object3D): { id: HotspotId; root: THREE.Object3D } | null {
  let current: THREE.Object3D | null = object
  while (current) {
    const id = hotspotFromObjectName(current.name)
    if (id) return { id, root: current }
    current = current.parent
  }
  return null
}

function findHotspotInEvent(event: Pick<ThreeEvent<PointerEvent>, 'intersections' | 'object'>) {
  for (const intersection of event.intersections) {
    const target = findHotspot(intersection.object)
    if (target) return target
  }
  return findHotspot(event.object)
}

function setHovered(root: THREE.Object3D, hovered: boolean) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return
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

function RoomModel({ onSelect }: Pick<SceneProps, 'onSelect'>) {
  const main = useGLTF(MODEL_URL, '/draco/')
  const props = useGLTF(PROPS_URL)
  const [hovered, setHoveredState] = useState<{ id: HotspotId; root: THREE.Object3D } | null>(null)
  const pressStart = useRef<{ x: number; y: number; id: HotspotId } | null>(null)

  const prepared = useMemo(() => {
    const room = main.scene.clone(true)
    const interactionProps = props.scene.clone(true)
    ;[room, interactionProps].forEach((scene) => {
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.castShadow = true
        object.receiveShadow = true
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
    return {
      room,
      interactionProps,
      scale,
      position: new THREE.Vector3(-center.x * scale, -center.y * scale + 0.05, -center.z * scale),
    }
  }, [main.scene, props.scene])

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
    return () => { document.body.style.cursor = '' }
  }, [hovered])

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const next = findHotspotInEvent(event)
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
    const target = findHotspotInEvent(event)
    pressStart.current = target
      ? { x: event.clientX, y: event.clientY, id: target.id }
      : null
  }

  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    const started = pressStart.current
    pressStart.current = null
    if (!started) return
    const target = findHotspotInEvent(event)
    if (!target || target.id !== started.id) return
    const movement = Math.hypot(event.clientX - started.x, event.clientY - started.y)
    if (movement > 8) return
    event.stopPropagation()
    const point = new THREE.Box3().setFromObject(target.root).getCenter(new THREE.Vector3())
    onSelect(target.id, point)
  }

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    const target = findHotspotInEvent(event)
    if (!target) return
    event.stopPropagation()
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
      </group>
      {hovered && (
        <Html
          center
          position={new THREE.Box3().setFromObject(hovered.root).getCenter(new THREE.Vector3())}
          style={{ pointerEvents: 'none' }}
        >
          <div className="hotspot-tooltip">
            <span>{hotspotMeta[hovered.id].index}</span>
            {hotspotMeta[hovered.id].hoverLabel}
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

export function RoomScene({ entered, active, onSelect, onFocusComplete }: SceneProps) {
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
        <color attach="background" args={['#d8d4cd']} />
        <fog attach="fog" args={['#d8d4cd', 10.5, 19]} />
        <hemisphereLight args={['#fffaf1', '#7d7f7b', 2.7]} />
        <directionalLight position={[-4, 8, 5]} intensity={3.45} color="#fff3e7" castShadow />
        <directionalLight position={[5, 3, -4]} intensity={1.35} color="#dce8ff" />
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <RoomModel onSelect={onSelect} />
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
