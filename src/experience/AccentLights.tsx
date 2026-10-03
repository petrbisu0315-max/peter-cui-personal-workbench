import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createGlowTexture, createWindowGobo } from './surfaces'

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

function FloorLamp({ mix, glowTexture }: { mix: LightingMix; glowTexture: THREE.Texture }) {
  const bulb = useRef<THREE.PointLight>(null!)
  const glow = useRef<THREE.Sprite>(null!)
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b2622', metalness: 0.7, roughness: 0.38 }), [])
  const globe = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f1ebe0',
    emissive: '#ffbe73',
    emissiveIntensity: 0,
    roughness: 0.28,
    userData: { noHover: true },
  }), [])
  useEffect(() => () => { metal.dispose(); globe.dispose() }, [metal, globe])

  useFrame(() => {
    const on = lightsOn(mix.current.value)
    bulb.current.intensity = 1.7 * on
    globe.emissiveIntensity = 2.6 * on
    glow.current.visible = on > 0.01
    ;(glow.current.material as THREE.SpriteMaterial).opacity = 0.55 * on
  })

  const globeY = 3.6
  return (
    <group name="ACCENT_FloorLamp" position={[3.15, 0, -2.55]}>
      <mesh material={metal} position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.33, 0.06, 32]} />
      </mesh>
      <mesh material={metal} position={[0, globeY / 2, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, globeY - 0.3, 12]} />
      </mesh>
      <mesh material={metal} position={[0, globeY - 0.33, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.08, 16]} />
      </mesh>
      <mesh material={globe} position={[0, globeY, 0]} castShadow>
        <sphereGeometry args={[0.32, 40, 28]} />
      </mesh>
      <pointLight ref={bulb} position={[0, globeY, 0]} color="#ffbb70" intensity={0} decay={2} />
      <sprite ref={glow} position={[0, globeY, 0.05]} scale={2.1} visible={false} raycast={noRaycast}>
        <spriteMaterial map={glowTexture} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  )
}

const sunColor = new THREE.Color('#ffe0b0')
const moonColor = new THREE.Color('#9fb6ff')

// A window off-screen to the left: warm sunlight by day, a faint cool moon patch at night.
function WindowLight({ mix }: { mix: LightingMix }) {
  const spot = useRef<THREE.SpotLight>(null!)
  const target = useSpotTarget([1.2, 3.2, WALL_Z])
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
        position={[-9, 8.6, 5.2]}
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

export function AccentLights({ mix }: { mix: LightingMix }) {
  const glowTexture = useMemo(createGlowTexture, [])
  useEffect(() => () => glowTexture.dispose(), [glowTexture])
  return (
    <>
      <WindowLight mix={mix} />
      {/* Bookcase spans x -1.69..0.95, y 2.49..4.26, front face z -2.98. */}
      <PictureLight mix={mix} bar={[-0.37, 4.5, -2.55]} length={1.8} aim={[-0.37, 3.15, -3.0]} intensity={3.2} angle={0.85} />
      {/* Poster frame spans x 1.51..2.67, y 2.41..4.20. */}
      <PictureLight mix={mix} bar={[2.09, 4.4, -2.72]} length={0.9} aim={[2.09, 3.1, -3.06]} intensity={2.2} angle={0.8} />
      {/* Portrait whiteboard spans x -3.73..-2.39, y 2.43..4.21 (see RoomDecor). */}
      <PictureLight mix={mix} bar={[-3.06, 4.42, -2.86]} length={0.8} aim={[-3.06, 3.35, -3.24]} intensity={2.2} angle={0.85} />
      <FloorLamp mix={mix} glowTexture={glowTexture} />
    </>
  )
}
