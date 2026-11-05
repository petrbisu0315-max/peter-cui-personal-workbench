import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { chairPivot, mountOnSwivel } from './chairSpin'

/** A chair-like shape: a wide star base low down centred at (cx, cz), and a seat offset from it. */
function chairGeometry(cx: number, cz: number) {
  const base = new THREE.BoxGeometry(1, 0.1, 1).translate(cx, 0.05, cz)
  const seat = new THREE.BoxGeometry(0.5, 0.2, 0.5).translate(cx + 0.3, 0.8, cz - 0.4)
  const back = new THREE.BoxGeometry(0.5, 0.6, 0.1).translate(cx + 0.3, 1.2, cz - 0.7)
  const merge = (geometries: THREE.BufferGeometry[]) => {
    const positions: number[] = []
    geometries.forEach((g) => {
      const p = g.toNonIndexed().getAttribute('position')
      for (let i = 0; i < p.count; i += 1) positions.push(p.getX(i), p.getY(i), p.getZ(i))
    })
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  }
  return merge([base, seat, back])
}

describe('chair swivel', () => {
  it('finds the centre of the base, not of the whole chair', () => {
    const pivot = chairPivot(chairGeometry(0.4, -0.2))
    expect(pivot.x).toBeCloseTo(0.4, 5)
    expect(pivot.y).toBeCloseTo(-0.2, 5)
  })

  it('turns the chair about its base: the base stays put while the seat swings round', () => {
    const parent = new THREE.Group()
    const chair = new THREE.Mesh(chairGeometry(0.4, -0.2))
    chair.position.set(2, 0, 3)
    parent.add(chair)
    const swivel = mountOnSwivel(chair)!
    parent.updateMatrixWorld(true)
    const baseBefore = new THREE.Vector3(0.4, 0.05, -0.2).applyMatrix4(chair.matrixWorld)
    const seatBefore = new THREE.Vector3(0.7, 0.8, -0.6).applyMatrix4(chair.matrixWorld)

    swivel.rotation.y = Math.PI
    parent.updateMatrixWorld(true)
    const baseAfter = new THREE.Vector3(0.4, 0.05, -0.2).applyMatrix4(chair.matrixWorld)
    const seatAfter = new THREE.Vector3(0.7, 0.8, -0.6).applyMatrix4(chair.matrixWorld)

    expect(baseAfter.distanceTo(baseBefore)).toBeCloseTo(0, 5)
    expect(seatAfter.y).toBeCloseTo(seatBefore.y, 5)
    // Half a turn puts the seat on the opposite side of the column, at the same distance.
    expect(seatAfter.x - baseAfter.x).toBeCloseTo(-(seatBefore.x - baseBefore.x), 5)
    expect(seatAfter.z - baseAfter.z).toBeCloseTo(-(seatBefore.z - baseBefore.z), 5)
  })

  it('leaves the chair where it was when not turned', () => {
    const parent = new THREE.Group()
    const chair = new THREE.Mesh(chairGeometry(0.4, -0.2))
    chair.position.set(2, 0, 3)
    parent.add(chair)
    const before = new THREE.Box3().setFromObject(chair)
    mountOnSwivel(chair)
    parent.updateMatrixWorld(true)
    const after = new THREE.Box3().setFromObject(chair)
    expect(after.min.distanceTo(before.min)).toBeCloseTo(0, 5)
    expect(after.max.distanceTo(before.max)).toBeCloseTo(0, 5)
  })
})
