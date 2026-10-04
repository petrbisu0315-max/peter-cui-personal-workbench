import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createFloorLampModel, createLinenTexture, FLOOR_LAMP } from './floorLampModel'

describe('reference floor lamp', () => {
  it('has a drum shade, slender stem and curved base at the existing scale', () => {
    const model = createFloorLampModel()
    const bounds = new THREE.Box3().setFromObject(model.group)
    expect(model.group.name).toBe('ACCENT_FloorLamp')
    expect(bounds.min.y).toBeGreaterThanOrEqual(0)
    expect(bounds.max.y).toBeCloseTo(FLOOR_LAMP.shadeCenter + FLOOR_LAMP.shadeHeight / 2, 1)
    expect(model.group.getObjectByName('Bronze trumpet base')).toBeInstanceOf(THREE.Mesh)
    expect(model.group.getObjectByName('Slender brass stem')).toBeInstanceOf(THREE.Mesh)
    const shade = model.group.getObjectByName('Linen drum shade') as THREE.Mesh
    expect(shade.geometry.type).toBe('CylinderGeometry')
    expect((shade.material as THREE.MeshStandardMaterial).transparent).toBe(false)
    let triangles = 0
    model.group.traverse((object) => {
      if (object instanceof THREE.Mesh) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3
    })
    expect(triangles).toBeLessThan(5000)
    model.dispose()
  })

  it('preserves fabric texture while lighting it, and returns to unlit on day mode', () => {
    const model = createFloorLampModel()
    const shade = model.group.getObjectByName('Linen drum shade') as THREE.Mesh
    const material = shade.material as THREE.MeshStandardMaterial
    expect(material.userData.noHover).toBe(true)
    expect(material.emissiveMap).toBe(material.map)
    model.setLight(1)
    expect(material.emissiveIntensity).toBe(0.48)
    model.setLight(0.5)
    expect(material.emissiveIntensity).toBe(0.24)
    model.setLight(0)
    expect(material.emissiveIntensity).toBe(0)
    model.dispose()
  })

  it('creates a deterministic opaque linen weave without external assets', () => {
    const a = createLinenTexture()
    const b = createLinenTexture()
    expect(a.image.data).toEqual(b.image.data)
    expect(a.image.width).toBe(256)
    const data = a.image.data!
    expect(data).not.toBeNull()
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255)
    expect(new Set(Array.from(data).filter((_, i) => i % 4 === 0)).size).toBeGreaterThan(10)
    a.dispose()
    b.dispose()
  })
})
