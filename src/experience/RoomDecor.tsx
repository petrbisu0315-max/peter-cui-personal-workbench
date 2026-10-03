import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { createRugTextures, createWhiteboardTexture } from './surfaces'

// All sizes and positions are in the room GLB's own coordinates, so these sit inside the same scaled group.
const BOARD = { x: -3.06, y: 3.32, z: -3.25, width: 1.24, height: 1.68 }
// Under the desk (x -2.95..1.90, z -1.47..0.04) and the chair (z up to ~1.75), clear of the speaker cabinet.
const RUG = { x: -0.35, z: 0.5, width: 5.2, depth: 3.7, thickness: 0.035 }

const noRaycast = () => undefined

/** Portrait whiteboard; its name keeps it mapped to the whiteboard hotspot. */
function PortraitWhiteboard() {
  const [face, setFace] = useState<THREE.Texture | null>(null)
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c8cbcf', metalness: 0.78, roughness: 0.32 }), [])
  const caps = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3d42', metalness: 0.2, roughness: 0.6 }), [])
  const backing = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e8e4', roughness: 0.7 }), [])
  const surface = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.32, metalness: 0 }), [])
  const marker = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.45 }), [])
  const markerCap = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a8482c', roughness: 0.45 }), [])

  useEffect(() => {
    let cancelled = false
    let texture: THREE.Texture | null = null
    void createWhiteboardTexture(BOARD.width, BOARD.height).then((created) => {
      if (cancelled) {
        created.dispose()
        return
      }
      texture = created
      surface.map = created
      surface.needsUpdate = true
      setFace(created)
    })
    return () => {
      cancelled = true
      texture?.dispose()
    }
  }, [surface])

  useEffect(() => () => {
    ;[frame, caps, backing, surface, marker, markerCap].forEach((material) => material.dispose())
  }, [frame, caps, backing, surface, marker, markerCap])

  const { width, height } = BOARD
  const bar = 0.045
  const depth = 0.05
  const halfW = width / 2 + bar / 2
  const halfH = height / 2 + bar / 2
  return (
    <group name="PROP_CanvasBoard" position={[BOARD.x, BOARD.y, BOARD.z]} userData={{ ready: Boolean(face) }}>
      <mesh material={backing} castShadow>
        <boxGeometry args={[width + 0.02, height + 0.02, 0.03]} />
      </mesh>
      <mesh material={surface} position={[0, 0, 0.0155]}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh material={frame} position={[0, halfH, 0.01]} castShadow>
        <boxGeometry args={[width + bar * 2, bar, depth]} />
      </mesh>
      <mesh material={frame} position={[0, -halfH, 0.01]} castShadow>
        <boxGeometry args={[width + bar * 2, bar, depth]} />
      </mesh>
      <mesh material={frame} position={[-halfW, 0, 0.01]} castShadow>
        <boxGeometry args={[bar, height + bar * 2, depth]} />
      </mesh>
      <mesh material={frame} position={[halfW, 0, 0.01]} castShadow>
        <boxGeometry args={[bar, height + bar * 2, depth]} />
      </mesh>
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => (
        <mesh key={`${sx}${sy}`} material={caps} position={[sx * halfW, sy * halfH, 0.012]}>
          <boxGeometry args={[0.075, 0.075, 0.06]} />
        </mesh>
      ))}
      <mesh material={frame} position={[0, -halfH - 0.05, 0.06]} castShadow>
        <boxGeometry args={[width * 0.62, 0.025, 0.11]} />
      </mesh>
      <group position={[0.12, -halfH - 0.02, 0.07]} rotation={[0, 0.12, Math.PI / 2]}>
        <mesh material={marker} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 14]} />
        </mesh>
        <mesh material={markerCap} position={[0, 0.115, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.05, 14]} />
        </mesh>
      </group>
    </group>
  )
}

function WovenRug() {
  const textures = useMemo(() => createRugTextures(RUG.width, RUG.depth), [])
  const materials = useMemo(() => {
    const top = new THREE.MeshStandardMaterial({
      map: textures.map,
      bumpMap: textures.bumpMap,
      bumpScale: 0.006,
      roughness: 0.96,
      metalness: 0,
    })
    const edge = new THREE.MeshStandardMaterial({ color: '#7f3f30', roughness: 0.95 })
    // BoxGeometry face order: +x, -x, +y (top), -y, +z, -z.
    return [edge, edge, top, edge, edge, edge]
  }, [textures])

  useEffect(() => () => {
    textures.map.dispose()
    textures.bumpMap.dispose()
    new Set(materials).forEach((material) => material.dispose())
  }, [materials, textures])

  return (
    <mesh
      name="ACCENT_Rug"
      material={materials}
      position={[RUG.x, RUG.thickness / 2, RUG.z]}
      receiveShadow
      raycast={noRaycast}
    >
      <boxGeometry args={[RUG.width, RUG.thickness, RUG.depth]} />
    </mesh>
  )
}

export function RoomDecor() {
  return (
    <>
      <PortraitWhiteboard />
      <WovenRug />
    </>
  )
}
