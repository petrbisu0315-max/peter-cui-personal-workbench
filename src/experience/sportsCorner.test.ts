import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import books from '../data/books.json'
import { BASKETBALL_CENTER, BASKETBALL_RADIUS, channelDistance, createBasketball } from './basketballModel'
import { BOOKCASE_BOUNDS, BOOKCASE_NODE_NAME, createBookcase, planBooks, SHELF_TOPS } from './bookcaseModel'
import { hotspotFromObjectName } from './hotspots'
import { JERSEYS } from './jerseyArt'
import { BASE_TOP, createSportsRack, JERSEY_Z, SPORTS_RACK_BOUNDS } from './sportsRackModel'

function bounds(object: THREE.Object3D, precise = true) {
  object.updateMatrixWorld(true)
  return new THREE.Box3().setFromObject(object, precise)
}

function triangles(object: THREE.Object3D) {
  let total = 0
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const geometry = child.geometry as THREE.BufferGeometry
    total += (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3
  })
  return total
}

const within = (box: THREE.Box3, limits: { min: readonly number[]; max: readonly number[] }, slack: number) => {
  ;(['x', 'y', 'z'] as const).forEach((axis, index) => {
    expect(box.min[axis]).toBeGreaterThanOrEqual(limits.min[index] - slack)
    expect(box.max[axis]).toBeLessThanOrEqual(limits.max[index] + slack)
  })
}

describe('sports rack', () => {
  const rack = createSportsRack()
  const box = bounds(rack)

  it('stays inside the footprint of the scanned wardrobe it replaces', () => {
    within(box, SPORTS_RACK_BOUNDS, 0.01)
  })

  it('hangs five jerseys in order along the rail, clear of the base', () => {
    const jerseys = JERSEYS.map((design) => rack.getObjectByName(`RACK_Jersey_${design.id}`)!)
    expect(jerseys.every(Boolean)).toBe(true)
    jerseys.forEach((jersey, index) => {
      expect(jersey.position.z).toBeCloseTo(JERSEY_Z[index], 5)
      expect(bounds(jersey).min.y).toBeGreaterThan(BASE_TOP + 0.3)
    })
  })

  it('stays within a triangle budget', () => {
    expect(triangles(rack)).toBeLessThan(70_000)
  })
})

describe('basketball', () => {
  it('sits where the scanned ball sat, resting on the rack base', () => {
    const box = bounds(createBasketball())
    const center = box.getCenter(new THREE.Vector3())
    expect(center.toArray().map((value) => Number(value.toFixed(3)))).toEqual(BASKETBALL_CENTER.map((value) => Number(value.toFixed(3))))
    expect(box.min.y).toBeCloseTo(BASE_TOP, 2)
    expect(box.max.x - box.min.x).toBeCloseTo(BASKETBALL_RADIUS * 2, 3)
  })

  it('has continuous channels: the equator, the meridian and the curved pair', () => {
    expect(channelDistance(0, 0, 1)).toBeCloseTo(0, 5)
    expect(channelDistance(0, 1, 0)).toBeCloseTo(0, 5)
    // The curved channel crosses the equator 0.74 rad from the +x pole.
    expect(channelDistance(Math.cos(0.74), 0, Math.sin(0.74))).toBeCloseTo(0, 5)
    // The middle of a panel is well clear of every channel.
    const panel = new THREE.Vector3(0.45, 0.35, 0.82).normalize()
    expect(channelDistance(panel.x, panel.y, panel.z)).toBeGreaterThan(0.1)
  })
})

describe('bookcase', () => {
  const bookcase = createBookcase()
  const box = bounds(bookcase)

  it('keeps the scanned bookcase bounds and the reading-shelf hotspot', () => {
    within(box, BOOKCASE_BOUNDS, 0.01)
    expect(bookcase.name).toBe(BOOKCASE_NODE_NAME)
    expect(hotspotFromObjectName(bookcase.name)).toBe('books')
  })

  it('shelves every book on the reading list, each standing on a shelf', () => {
    const placements = planBooks()
    const real = placements.filter((book) => book.spine.kind === 'real')
    expect(real).toHaveLength(books.length)
    const surfaces = new Set(SHELF_TOPS.map((top) => top.toFixed(3)))
    for (const book of placements) {
      const geometry = new THREE.BoxGeometry(book.width, book.height, book.depth).applyMatrix4(book.matrix)
      geometry.computeBoundingBox()
      const bottom = geometry.boundingBox!.min.y
      // Upright books wobble a hair; stacked books sit on the one below.
      const resting = [...surfaces].some((top) => Math.abs(bottom - Number(top)) < 0.002) || bottom > SHELF_TOPS[4]
      expect(resting).toBe(true)
    }
  })

  it('stays within a triangle budget', () => {
    expect(triangles(bookcase)).toBeLessThan(40_000)
  })
})
