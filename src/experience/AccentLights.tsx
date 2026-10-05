import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createWindowGobo } from './surfaces'
import { createFloorLampModel, FLOOR_LAMP } from './floorLampModel'

export type LightingMix = MutableRefObject<{ value: number }>

type Vec3 = [number, number, number]

// Wall front face in the GLB's coordinates; every fixture below uses the same model space.
const WALL_Z = -3.24

// Lights come on after the room has started to dim, so they read as being switched on.
export function lightsOn(mix: number) {
  return THREE.MathUtils.smoothstep(mix, 0.35, 1)
}

function useSpotTarget(position: Vec3) {
  const target = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    target.position.set(...position)
  }, [position, target])
  return target
}

const noRaycast = () => undefined

function PictureLight({ mix, bar, length, aim, intensity, angle }: {
  mix: LightingMix
  bar: Vec3
  length: number
  aim: Vec3
  intensity: number
  angle: number
}) {
  const spot = useRef<THREE.SpotLight>(null!)
  const target = useSpotTarget(aim)
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b48d52', metalness: 0.82, roughness: 0.34 }), [])
  const diffuser = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f3e6cc',
    emissive: '#ffcf8f',
    emissiveIntensity: 0,
    roughness: 0.5,
    userData: { noHover: true },
  }), [])
  const armLength = bar[2] - WALL_Z
  useEffect(() => () => { brass.dispose(); diffuser.dispose() }, [brass, diffuser])

  useFrame(() => {
    const on = lightsOn(mix.current.value)
    spot.current.intensity = intensity * on
    diffuser.emissiveIntensity = 2.4 * on
  })

  return (
    <group>
      <mesh material={brass} position={[bar[0], bar[1] + 0.02, WALL_Z + 0.015]} raycast={noRaycast}>
        <boxGeometry args={[0.16, 0.16, 0.03]} />
      </mesh>
      <mesh material={brass} position={[bar[0], bar[1] + 0.02, WALL_Z + armLength / 2]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.018, 0.018, armLength, 10]} />
      </mesh>
      <mesh material={brass} position={bar} rotation={[0, 0, Math.PI / 2]} castShadow raycast={noRaycast}>
        <cylinderGeometry args={[0.045, 0.045, length, 20]} />
      </mesh>
      <mesh material={diffuser} position={[bar[0], bar[1] - 0.04, bar[2] - 0.005]} raycast={noRaycast}>
        <boxGeometry args={[length * 0.92, 0.01, 0.05]} />
      </mesh>
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[bar[0], bar[1] - 0.06, bar[2]]}
        target={target}
        color="#ffcb8a"
        intensity={0}
        angle={angle}
        penumbra={0.85}
        decay={2}
      />
    </group>
  )
}

function FloorLamp({ mix }: { mix: LightingMix }) {
  const bulb = useRef<THREE.PointLight>(null!)
  const model = useMemo(createFloorLampModel, [])
  useEffect(() => () => model.dispose(), [model])

  useFrame(() => {
    const on = lightsOn(mix.current.value)
    bulb.current.intensity = 1.15 * on
    model.setLight(on)
  })

  return (
    <group name="ACCENT_FloorLamp" position={FLOOR_LAMP.position}>
      <primitive object={model.group} dispose={null} />
      <pointLight
        ref={bulb}
        position={[0, FLOOR_LAMP.shadeCenter - 0.12, 0]}
        color="#ffe3b5"
        intensity={0}
        decay={2}
      />
    </group>
  )
}

const sunColor = new THREE.Color('#ffe0b0')
const moonColor = new THREE.Color('#9fb6ff')

// Bedroom light comes from the right; the other environments keep their original direction.
function WindowLight({ mix, rightWindow }: { mix: LightingMix; rightWindow: boolean }) {
  const spot = useRef<THREE.SpotLight>(null!)
  const target = useSpotTarget([rightWindow ? -1.2 : 1.2, 3.2, WALL_Z])
  const gobo = useMemo(createWindowGobo, [])
  useEffect(() => () => gobo.dispose(), [gobo])

  useFrame(() => {
    const t = mix.current.value
    spot.current.intensity = THREE.MathUtils.lerp(2.4, 0.9, t)
    spot.current.color.copy(sunColor).lerp(moonColor, t)
  })

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[rightWindow ? 9 : -9, 8.6, 5.2]}
        target={target}
        map={gobo}
        angle={0.21}
        penumbra={0.2}
        decay={0}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
    </>
  )
}

export function AccentLights({ mix, rightWindow = false }: { mix: LightingMix; rightWindow?: boolean }) {
  return (
    <>
      <WindowLight mix={mix} rightWindow={rightWindow} />
      {/* Bookcase spans x -1.69..0.95, y 2.49..4.26, front face z -2.98. */}
      <PictureLight mix={mix} bar={[-0.37, 4.5, -2.55]} length={1.8} aim={[-0.37, 3.15, -3.0]} intensity={2} angle={0.95} />
      {/* Poster frame spans x 1.51..2.67, y 2.41..4.20. */}
      <PictureLight mix={mix} bar={[2.09, 4.4, -2.72]} length={0.9} aim={[2.09, 3.1, -3.06]} intensity={1.2} angle={0.9} />
      {/* Portrait whiteboard spans x -3.73..-2.39, y 2.43..4.21 (see RoomDecor). */}
      <PictureLight mix={mix} bar={[-3.06, 4.42, -2.86]} length={0.8} aim={[-3.06, 3.35, -3.24]} intensity={0.9} angle={0.95} />
      <FloorLamp mix={mix} />
    </>
  )
}
