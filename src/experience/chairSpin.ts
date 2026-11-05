import gsap from 'gsap'
import * as THREE from 'three'

/**
 * Where the chair turns. The scan's origin is not on the swivel, so the pivot is the centre of the
 * lowest slice of the chair (its star base and casters), which is symmetric about the column.
 */
export function chairPivot(geometry: THREE.BufferGeometry, sliceFraction = 0.25): THREE.Vector2 {
  const position = geometry.getAttribute('position')
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const ceiling = box.min.y + (box.max.y - box.min.y) * sliceFraction
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (let i = 0; i < position.count; i += 1) {
    if (position.getY(i) > ceiling) continue
    const x = position.getX(i)
    const z = position.getZ(i)
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  return new THREE.Vector2((minX + maxX) / 2, (minZ + maxZ) / 2)
}

/** Re-parents `chair` under a group centred on its swivel and returns that group. */
export function mountOnSwivel(chair: THREE.Mesh): THREE.Group | null {
  const parent = chair.parent
  if (!parent) return null
  const pivot = chairPivot(chair.geometry)
  const swivel = new THREE.Group()
  swivel.name = 'PROP_OfficeChair_Swivel'
  swivel.position.set(chair.position.x + pivot.x * chair.scale.x, chair.position.y, chair.position.z + pivot.y * chair.scale.z)
  parent.add(swivel)
  swivel.add(chair)
  chair.position.set(-pivot.x, 0, -pivot.y)
  return swivel
}

const FULL_TURN = Math.PI * 2

/** A turn that starts fast and coasts to rest; a click while it is moving adds another turn. */
export function spinChair(swivel: THREE.Object3D, reducedMotion = false) {
  if (reducedMotion) {
    swivel.rotation.y += FULL_TURN
    return
  }
  const moving = gsap.isTweening(swivel.rotation)
  gsap.to(swivel.rotation, {
    y: swivel.rotation.y + FULL_TURN * (moving ? 1.5 : 1),
    duration: moving ? 2.4 : 1.8,
    ease: 'power3.out',
    overwrite: 'auto',
  })
}
