import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BODY_DEPTH, BODY_WIDTH, CAMERA_NODE_NAME, createCameraModel, LENS_LENGTH, PRISM_TOP } from './cameraModel'
import { hotspotFromObjectName } from './hotspots'

const model = createCameraModel()
model.updateMatrixWorld(true)
const box = new THREE.Box3().setFromObject(model)

function triangles() {
  let total = 0
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const geometry = child.geometry as THREE.BufferGeometry
    total += (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3
  })
  return total
}

describe('camera model', () => {
  it('is named so the room resolves it to the photos hotspot', () => {
    expect(model.name).toBe(CAMERA_NODE_NAME)
    expect(hotspotFromObjectName(model.name)).toBe('photos')
  })

  it('stands flat on the desk', () => {
    expect(box.min.y).toBeCloseTo(0, 5)
  })

  it('matches the scanned camera footprint, plus its lens in front', () => {
    const size = box.getSize(new THREE.Vector3())
    expect(size.x).toBeGreaterThanOrEqual(BODY_WIDTH)
    expect(size.x).toBeLessThan(BODY_WIDTH + 0.03)
    expect(size.y).toBeCloseTo(PRISM_TOP + 0.004, 2)
    expect(box.max.z).toBeCloseTo(BODY_DEPTH / 2 + 0.011 + LENS_LENGTH, 2)
    expect(box.min.z).toBeGreaterThan(-BODY_DEPTH / 2 - 0.01)
  })

  it('keeps the lens on the camera axis, centred', () => {
    const lens = new THREE.Box3().setFromObject(model.getObjectByName('CAMERA_Lens')!)
    expect((lens.min.x + lens.max.x) / 2).toBeCloseTo(0, 4)
    expect(lens.max.x - lens.min.x).toBeCloseTo(0.14, 2)
  })

  it('stays within a small triangle budget', () => {
    expect(triangles()).toBeLessThan(40_000)
  })

  it('has square, unwarped body plates', () => {
    ;['CAMERA_Body', 'CAMERA_TopDeck', 'CAMERA_BasePlate'].forEach((name) => {
      const part = new THREE.Box3().setFromObject(model.getObjectByName(name)!)
      expect(part.max.x - part.min.x).toBeCloseTo(BODY_WIDTH, 2)
      expect(part.max.z - part.min.z).toBeCloseTo(BODY_DEPTH, 2)
      expect((part.min.x + part.max.x) / 2).toBeCloseTo(0, 5)
    })
  })
})
