import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { benchColumns, benchLayout, BENCH_SPACING, LABEL_STYLES, type CanPlacement, type Roll } from './filmRolls'

/** Radius and length of a canister body, in bench units. */
const CAN_RADIUS = 0.55
const CAN_LENGTH = 1.5
const FLANGE = 0.07
const VISIBLE_COLUMNS = { wide: 4.5, tall: 2.6 }

const LABEL_FONT_FACES = ['800 64px Manrope', '500 28px "DM Mono"', '600 40px Manrope']

function drawLabel(roll: Roll, position: number, canvas: HTMLCanvasElement) {
  const style = LABEL_STYLES[roll.style]
  const ctx = canvas.getContext('2d')!
  const { width: W, height: H } = canvas
  ctx.fillStyle = style.paper
  ctx.fillRect(0, 0, W, H)

  // The readable part faces up when the can lies on the bench: a third of the way round.
  const cx = W * 0.25
  const half = W * 0.17
  ctx.fillStyle = style.accent
  ctx.fillRect(0, 0, W, H * 0.13)
  ctx.fillRect(0, H * 0.93, W, H * 0.07)

  ctx.fillStyle = style.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.font = '500 26px "DM Mono", monospace'
  ctx.globalAlpha = 0.72
  ctx.fillText(`ROLL ${String(position + 1).padStart(2, '0')} · ${roll.frames.length} EXP`, cx, H * 0.23)
  ctx.globalAlpha = 1

  // The city name, shrunk until it fits the readable part of the label.
  const title = roll.name.toUpperCase()
  let size = 92
  ctx.font = `800 ${size}px Manrope, "PingFang SC", sans-serif`
  while (ctx.measureText(title).width > half * 2 && size > 28) {
    size -= 4
    ctx.font = `800 ${size}px Manrope, "PingFang SC", sans-serif`
  }
  ctx.fillText(title, cx, H * 0.43)

  if (roll.nameCn) {
    ctx.font = '600 44px Manrope, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = style.accent
    ctx.fillText(roll.nameCn, cx, H * 0.55)
  }

  ctx.fillStyle = style.ink
  ctx.font = '800 150px Manrope, sans-serif'
  ctx.fillText(String(roll.iso), cx, H * 0.78)

  ctx.font = '500 22px "DM Mono", monospace'
  ctx.globalAlpha = 0.7
  ctx.fillText('COLOR NEGATIVE FILM · 35 MM', cx, H * 0.88)
  ctx.globalAlpha = 1
}

function makeLabelTexture(roll: Roll, position: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  drawLabel(roll, position, canvas)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return { texture, redraw: () => { drawLabel(roll, position, canvas); texture.needsUpdate = true } }
}

type CanProps = {
  roll: Roll
  position: number
  placement: CanPlacement
  hovered: boolean
  onHover: (index: number | null) => void
  onSelect: (id: string) => void
}

function Can({ roll, position, placement, hovered, onHover, onSelect }: CanProps) {
  const group = useRef<THREE.Group>(null!)
  const { invalidate } = useThree()
  const state = useRef({ lift: 0, appear: 0, elapsed: 0 })
  const style = LABEL_STYLES[roll.style]
  const label = useMemo(() => makeLabelTexture(roll, position), [roll, position])

  useEffect(() => {
    if (document.fonts) void Promise.allSettled(LABEL_FONT_FACES.map((face) => document.fonts.load(face))).then(() => {
      label.redraw()
      invalidate()
    })
    return () => label.texture.dispose()
  }, [label, invalidate])

  useFrame((_, delta) => {
    const current = state.current
    current.elapsed += delta
    // Cans settle onto the bench one after another.
    if (current.elapsed > Math.min(position * 0.04, 0.5)) current.appear = THREE.MathUtils.damp(current.appear, 1, 7, delta)
    current.lift = THREE.MathUtils.damp(current.lift, hovered ? 1 : 0, 14, delta)
    const rise = current.lift * 0.32 + (1 - current.appear) * 1.4
    group.current.position.y = CAN_RADIUS + rise
    const scale = 0.4 + 0.6 * current.appear + current.lift * 0.05
    group.current.scale.setScalar(scale)
    const settled = current.appear > 0.998 && Math.abs((hovered ? 1 : 0) - current.lift) < 0.002
    if (!settled) invalidate()
  })

  const cap = useMemo(() => new THREE.MeshStandardMaterial({ color: style.cap, roughness: 0.55, metalness: 0.25 }), [style.cap])
  const body = useMemo(
    () => new THREE.MeshStandardMaterial({ map: label.texture, roughness: 0.62, metalness: 0.02 }),
    [label.texture],
  )
  useEffect(() => () => { cap.dispose(); body.dispose() }, [cap, body])

  const stop = (event: ThreeEvent<PointerEvent>) => event.stopPropagation()
  return (
    <group
      ref={group}
      position={[placement.x, CAN_RADIUS, placement.z]}
      // The axis is laid out along bench Z; a can leans a little off vertical like it was dropped there.
      rotation={[0, -Math.PI / 2 + placement.lean, 0]}
      onPointerOver={(event) => { stop(event); onHover(position) }}
      onPointerOut={() => onHover(null)}
      onClick={(event) => {
        // A drag across the bench is not a choice.
        if (event.delta > 6) return
        event.stopPropagation()
        onSelect(roll.id)
      }}
    >
      <mesh castShadow receiveShadow material={body} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[CAN_RADIUS, CAN_RADIUS, CAN_LENGTH, 48]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} castShadow material={cap} position={[side * (CAN_LENGTH / 2 + FLANGE / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[CAN_RADIUS * 1.04, CAN_RADIUS * 1.04, FLANGE, 48]} />
        </mesh>
      ))}
      <mesh castShadow material={cap} position={[CAN_LENGTH / 2 + FLANGE + 0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.14, 24]} />
      </mesh>
      <mesh castShadow material={cap} position={[-(CAN_LENGTH / 2 + FLANGE + 0.04), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.08, 32]} />
      </mesh>
    </group>
  )
}

function tableTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#271912'
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = 'rgba(255,214,190,0.07)'
  ctx.lineWidth = 3
  ctx.strokeRect(0, 0, 512, 512)
  ctx.strokeStyle = 'rgba(255,214,190,0.025)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath()
    ctx.moveTo((512 / 4) * i, 0)
    ctx.lineTo((512 / 4) * i, 512)
    ctx.moveTo(0, (512 / 4) * i)
    ctx.lineTo(512, (512 / 4) * i)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(24, 24)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Camera, drag and wheel panning of the bench. */
function Bench({ rolls, hoveredIndex, onHover, onSelect }: {
  rolls: Roll[]
  hoveredIndex: number | null
  onHover: (index: number | null) => void
  onSelect: (id: string) => void
}) {
  const { size, camera, invalidate, gl } = useThree()
  const aspect = size.width / Math.max(1, size.height)
  const columns = benchColumns(aspect, rolls.length)
  const placements = useMemo(() => benchLayout(rolls.length, columns), [rolls.length, columns])
  const rows = Math.ceil(rolls.length / columns)
  const bench = useRef<THREE.Group>(null!)
  const pan = useRef({ x: 0, z: 0, tx: 0, tz: 0, started: false })
  const floor = useMemo(tableTexture, [])
  useEffect(() => () => floor.dispose(), [floor])

  // The camera looks straight down from a height at which a few columns fill the view.
  const visibleWidth = (aspect >= 1.2 ? VISIBLE_COLUMNS.wide : VISIBLE_COLUMNS.tall) * BENCH_SPACING.x
  const fov = 34
  const distance = visibleWidth / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect)
  const visibleDepth = visibleWidth / aspect
  const extent = {
    x: Math.max(0, ((columns - 1) * BENCH_SPACING.x) / 2 + 0.6 - (visibleWidth / 2 - BENCH_SPACING.x * 0.7)),
    z: Math.max(0, ((rows - 1) * BENCH_SPACING.z) / 2 + 0.6 - (visibleDepth / 2 - BENCH_SPACING.z * 0.7)),
  }

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = fov
    cam.position.set(0, distance, distance * 0.16)
    cam.lookAt(0, 0, 0)
    cam.updateProjectionMatrix()
    // The bench opens on its first row, so the first rolls are what is seen.
    if (!pan.current.started) {
      pan.current.started = true
      pan.current.tz = pan.current.z = -extent.z
    }
    pan.current.tx = THREE.MathUtils.clamp(pan.current.tx, -extent.x, extent.x)
    pan.current.tz = THREE.MathUtils.clamp(pan.current.tz, -extent.z, extent.z)
    invalidate()
  }, [camera, distance, extent.x, extent.z, invalidate])

  useEffect(() => {
    const element = gl.domElement
    let drag: { x: number; y: number; tx: number; tz: number } | null = null
    const unitsPerPixel = visibleWidth / size.width
    const move = (event: PointerEvent) => {
      if (!drag) return
      pan.current.tx = THREE.MathUtils.clamp(drag.tx - (event.clientX - drag.x) * unitsPerPixel, -extent.x, extent.x)
      pan.current.tz = THREE.MathUtils.clamp(drag.tz - (event.clientY - drag.y) * unitsPerPixel, -extent.z, extent.z)
      invalidate()
    }
    const down = (event: PointerEvent) => {
      drag = { x: event.clientX, y: event.clientY, tx: pan.current.tx, tz: pan.current.tz }
      element.setPointerCapture?.(event.pointerId)
      element.style.cursor = 'grabbing'
    }
    const up = (event: PointerEvent) => {
      drag = null
      element.releasePointerCapture?.(event.pointerId)
      element.style.cursor = ''
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      pan.current.tx = THREE.MathUtils.clamp(pan.current.tx + event.deltaX * unitsPerPixel, -extent.x, extent.x)
      pan.current.tz = THREE.MathUtils.clamp(pan.current.tz + event.deltaY * unitsPerPixel, -extent.z, extent.z)
      invalidate()
    }
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', up)
    element.addEventListener('wheel', wheel, { passive: false })
    return () => {
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', up)
      element.removeEventListener('wheel', wheel)
    }
  }, [gl, size.width, visibleWidth, extent.x, extent.z, invalidate])

  useFrame((_, delta) => {
    const p = pan.current
    p.x = THREE.MathUtils.damp(p.x, p.tx, 9, delta)
    p.z = THREE.MathUtils.damp(p.z, p.tz, 9, delta)
    bench.current.position.set(-p.x, 0, -p.z)
    if (Math.abs(p.x - p.tx) > 0.001 || Math.abs(p.z - p.tz) > 0.001) invalidate()
  })

  return (
    <group ref={bench}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={floor} roughness={0.9} metalness={0} />
      </mesh>
      {rolls.map((roll, index) => (
        <Can
          key={roll.id}
          roll={roll}
          position={index}
          placement={placements[index]}
          hovered={hoveredIndex === index}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

export default function FilmBench3D({ rolls, hoveredIndex, onHover, onSelect }: {
  rolls: Roll[]
  hoveredIndex: number | null
  onHover: (index: number | null) => void
  onSelect: (id: string) => void
}) {
  return (
    <Canvas
      className="fb-canvas"
      frameloop="demand"
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 34, near: 0.5, far: 80, position: [0, 14, 2] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => onHover(null)}
    >
      <color attach="background" args={['#140d0a']} />
      <hemisphereLight args={['#ffe2cc', '#2a170f', 0.9]} />
      <directionalLight
        position={[-4, 12, 5]}
        intensity={2.1}
        color="#ffd9bd"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
      />
      <Bench rolls={rolls} hoveredIndex={hoveredIndex} onHover={onHover} onSelect={onSelect} />
    </Canvas>
  )
}
