import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  BASE_DEPTH,
  BASE_FRONT_Z,
  BASE_THICKNESS,
  BASE_WIDTH,
  createLaptopModel,
  HINGE,
  KEY_GAP,
  KEY_ROWS,
  KEYBOARD_UNITS,
  keyboardDepth,
  LAPTOP_NODE_NAME,
  layoutKeys,
  LID_HEIGHT,
  LID_THICKNESS,
  LID_WIDTH,
  SCREEN_CENTER,
  SCREEN_CHIN,
  SCREEN_HEIGHT,
  SCREEN_NORMAL,
  SCREEN_WIDTH,
  TRACKPAD,
} from './laptopModel'
import { hotspotFromObjectName } from './hotspots'

const model = createLaptopModel()
model.updateMatrixWorld(true)

function part(name: string) {
  const found = model.getObjectByName(name)
  if (!found) throw new Error(`missing ${name}`)
  return found as THREE.Mesh
}

/** Convex hull of 2D points (monotone chain), counter-clockwise. */
function hull(points: [number, number][]) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const build = (list: [number, number][]) => {
    const out: [number, number][] = []
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 1e-12) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...build(sorted), ...build([...sorted].reverse())]
}

function outline(mesh: THREE.Mesh) {
  const position = mesh.geometry.getAttribute('position')
  const seen = new Set<string>()
  const points: [number, number][] = []
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const id = `${x.toFixed(6)},${y.toFixed(6)}`
    if (!seen.has(id)) {
      seen.add(id)
      points.push([x, y])
    }
  }
  return hull(points)
}

describe('laptop silhouette', () => {
  it('is named so that the room resolves it to the projects hotspot', () => {
    expect(model.name).toBe(LAPTOP_NODE_NAME)
    expect(hotspotFromObjectName(part('LAPTOP_Lid').parent!.parent!.name)).toBe('projects')
  })

  it('has an exactly straight, smoothly rounded lid outline (no lumpy edges)', () => {
    const edge = outline(part('LAPTOP_Lid'))
    // Every turn between neighbouring outline segments is small, so a straight side can
    // only be straight and a corner can only be a smooth curve. A bump on an edge, which
    // is what the decimated scan had, shows up as a large turn and fails here.
    let worst = 0
    for (let i = 0; i < edge.length; i += 1) {
      const a = edge[i]
      const b = edge[(i + 1) % edge.length]
      const c = edge[(i + 2) % edge.length]
      const first = Math.atan2(b[1] - a[1], b[0] - a[0])
      const second = Math.atan2(c[1] - b[1], c[0] - b[0])
      let turn = Math.abs(second - first)
      if (turn > Math.PI) turn = 2 * Math.PI - turn
      worst = Math.max(worst, turn)
    }
    expect(edge.length).toBeGreaterThan(24)
    expect(worst).toBeLessThan(THREE.MathUtils.degToRad(20))

    // The four straight sides are exactly on the lid's width and height.
    const xs = edge.map((p) => p[0])
    const ys = edge.map((p) => p[1])
    expect(Math.min(...xs)).toBeCloseTo(-LID_WIDTH / 2, 6)
    expect(Math.max(...xs)).toBeCloseTo(LID_WIDTH / 2, 6)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(LID_HEIGHT, 6)
  })

  it('rounds the base the same way', () => {
    const edge = outline(part('LAPTOP_Base'))
    expect(edge.length).toBeGreaterThan(8)
    const xs = edge.map((p) => p[0])
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(BASE_WIDTH, 6)
  })

  it('stays far below the old scan\'s triangle count', () => {
    let triangles = 0
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const index = object.geometry.index
      const count = index ? index.count / 3 : object.geometry.getAttribute('position').count / 3
      triangles += count * (object instanceof THREE.InstancedMesh ? object.count : 1)
    })
    expect(triangles).toBeLessThan(40_000)
  })
})

describe('laptop proportions', () => {
  it('sits flat on the desk and keeps the old footprint', () => {
    const box = new THREE.Box3().setFromObject(model)
    expect(box.min.y).toBeGreaterThanOrEqual(-1e-6)
    expect(box.min.y).toBeLessThan(0.001)
    expect(box.max.x - box.min.x).toBeCloseTo(BASE_WIDTH, 2)
    expect(box.max.z).toBeCloseTo(BASE_FRONT_Z, 2)
    // The old scan reached z -0.401 and y 0.833.
    expect(box.min.z).toBeGreaterThan(-0.42)
    expect(box.max.y).toBeGreaterThan(0.78)
    expect(box.max.y).toBeLessThan(0.86)
  })

  it('keeps the lid above the deck at the hinge', () => {
    const lid = part('LAPTOP_Lid')
    const box = new THREE.Box3().setFromObject(lid)
    expect(box.min.y).toBeGreaterThanOrEqual(BASE_THICKNESS - 0.002)
  })

  it('puts the hinge on the back edge of the base', () => {
    expect(HINGE.z).toBeCloseTo(BASE_FRONT_Z - BASE_DEPTH, 1)
    expect(HINGE.y).toBeGreaterThan(BASE_THICKNESS)
  })
})

describe('laptop display', () => {
  it('leans back with the lid and keeps the old viewing normal', () => {
    expect(SCREEN_NORMAL.x).toBeCloseTo(0, 6)
    expect(SCREEN_NORMAL.y).toBeCloseTo(0.294, 3)
    expect(SCREEN_NORMAL.z).toBeCloseTo(0.956, 3)
  })

  it('lies inside the lid with a visible bezel on every side', () => {
    expect((LID_WIDTH - SCREEN_WIDTH) / 2).toBeGreaterThanOrEqual(0.04)
    expect(SCREEN_CHIN).toBeGreaterThanOrEqual(0.05)
    expect(LID_HEIGHT - SCREEN_CHIN - SCREEN_HEIGHT).toBeGreaterThanOrEqual(0.045)
  })

  it('is centred on the lid front, resting on the glass', () => {
    const lid = part('LAPTOP_LidPivot')
    lid.updateMatrixWorld(true)
    const local = lid.worldToLocal(SCREEN_CENTER.clone())
    expect(local.x).toBeCloseTo(0, 6)
    expect(local.y).toBeCloseTo(SCREEN_CHIN + SCREEN_HEIGHT / 2, 6)
    expect(local.z).toBeGreaterThan(LID_THICKNESS / 2)
    expect(local.z).toBeLessThan(LID_THICKNESS / 2 + 0.005)
  })

  it('keeps the 16:10 shape the interface is laid out for', () => {
    expect(SCREEN_WIDTH / SCREEN_HEIGHT).toBeCloseTo(1280 / 821, 2)
  })
})

describe('laptop keyboard', () => {
  it('lays every row out to the same width', () => {
    for (const row of KEY_ROWS) {
      expect(row.keys.reduce((sum, span) => sum + span, 0)).toBeCloseTo(KEYBOARD_UNITS, 6)
    }
  })

  it('keeps each key clear of its neighbours and inside the keyboard area', () => {
    const keys = layoutKeys()
    expect(keys.length).toBe(KEY_ROWS.reduce((sum, row) => sum + row.keys.length, 0))
    const rows = new Map<number, typeof keys>()
    for (const key of keys) rows.set(key.z, [...(rows.get(key.z) ?? []), key])
    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x)
      for (let i = 1; i < sorted.length; i += 1) {
        const gap = sorted[i].x - sorted[i].width / 2 - (sorted[i - 1].x + sorted[i - 1].width / 2)
        expect(gap).toBeCloseTo(KEY_GAP, 6)
      }
    }
    for (const key of keys) {
      expect(Math.abs(key.x) + key.width / 2).toBeLessThanOrEqual(BASE_WIDTH / 2 - 0.05)
    }
  })

  it('leaves the trackpad on the base, below the keys', () => {
    const lastKeyEdge = Math.max(...layoutKeys().map((key) => key.z + key.depth / 2))
    const trackpad = part('LAPTOP_Trackpad')
    const box = new THREE.Box3().setFromObject(trackpad)
    expect(box.min.z).toBeGreaterThan(lastKeyEdge + 0.01)
    expect(box.max.z).toBeLessThan(BASE_FRONT_Z - 0.02)
    expect(box.max.x - box.min.x).toBeCloseTo(TRACKPAD.width, 2)
    expect(keyboardDepth()).toBeGreaterThan(0.3)
  })
})
