import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createJerseyTexture, createKnitNormalTexture, JERSEY_LENGTH, JERSEY_WIDTH, JERSEYS } from './jerseyArt'
import { createCanvas, createWoodTexture, random, toTexture } from './surfaces'

/**
 * The sports corner: a two-bay steel and walnut rack with five jerseys on hangers, a pegboard
 * with two badminton rackets and headphones, a shaker bottle, towels and a duffel bag.
 *
 * It replaces the scanned `SPORT_Wardrobe_GLB`, whose 2K texture atlas had to cover a dozen
 * objects, so every jersey got a few dozen blurred pixels. Everything here sits in the room
 * model's own coordinates, inside the footprint of the scan it replaces.
 */

export const SPORTS_RACK_NODE_NAME = 'SPORT_Rack'

/** The scanned wardrobe's bounds, which the rebuilt rack keeps. */
export const SPORTS_RACK_BOUNDS = { min: [5.993, 0.042, -2.728], max: [6.728, 3.64, 0.075] } as const

const FLOOR = 0.04
const PLINTH_TOP = 0.21
export const BASE_TOP = 0.276
const POST_RADIUS = 0.044
const POST_TOP = 3.6
const SHELF_TOP = 3.37
const SHELF_THICKNESS = 0.06

/** Jersey bay: posts on the centre line at either end, a rail between them. */
const JERSEY_BAY = { x: 6.33, zBack: -1.565, zFront: 0.008, minX: 6.05, maxX: 6.7, minZ: -1.62, maxZ: 0.072 }
export const RAIL_Y = 3.02
const RAIL_RADIUS = 0.021
export const JERSEY_Z = [-1.32, -1.045, -0.77, -0.495, -0.22]
/** Height of the hanger's neck, where the hook meets the shoulder bar. */
const HANGER_Y = 2.92

/** Pegboard bay, against the wall end of the rack. */
const PEG_BAY = { postX: 6.64, zBack: -2.66, zFront: -1.835, minX: 6.04, maxX: 6.69, minZ: -2.725, maxZ: -1.8 }
const BOARD_X = 6.615
const MID_SHELF_TOP = 1.36

type Track = <T extends { dispose: () => void }>(item: T) => T

function standard(options: THREE.MeshStandardMaterialParameters, name: string) {
  const material = new THREE.MeshStandardMaterial(options)
  material.name = name
  return material
}

const canPaint = () => typeof document !== 'undefined'

/** Jersey panel: a grid over the flat pattern, bowed off the hanger and draped into folds. */
export function createJerseyPanel(side: 'front' | 'back', seed: number) {
  const columns = 30
  const rows = 56
  const half = JERSEY_WIDTH / 2
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const sign = side === 'front' ? 1 : -1
  const phase = seed * 1.7
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows
    for (let column = 0; column <= columns; column += 1) {
      const s = (column / columns) * 2 - 1
      // Fabric flares slightly toward the hem and drops with the hanger's shoulder slope.
      const x = s * half * (1 + 0.05 * t)
      const y = -t * JERSEY_LENGTH - 0.05 * Math.abs(s) * (1 - t) ** 2
      const ramp = THREE.MathUtils.smoothstep(t, 0.04, 0.42)
      const separation = 0.004 + 0.016 * (1 - t) ** 3 + 0.032 * ramp * (1 - s ** 4) * (1 - 0.35 * t)
      const folds = THREE.MathUtils.smoothstep(t, 0.25, 1) * (
        0.012 * Math.sin(s * Math.PI * 2.4 + phase) + 0.006 * Math.sin(s * Math.PI * 5.2 + phase * 2.3)
      )
      positions.push(x, y, sign * separation + folds)
      // Front on the left half of the canvas; the back is seen from behind, so it is mirrored.
      const u = (s + 1) / 2
      uvs.push(side === 'front' ? u * 0.5 : 0.5 + (1 - u) * 0.5, 1 - t)
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column
      const b = a + 1
      const c = a + columns + 1
      const d = c + 1
      if (side === 'front') indices.push(a, c, b, b, c, d)
      else indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Black plastic hanger with a chrome hook, in the jersey's frame (origin at the neck). */
function createHanger(track: Track, plastic: THREE.Material, chrome: THREE.Material) {
  const group = new THREE.Group()
  group.name = 'RACK_Hanger'
  const railAbove = RAIL_Y - HANGER_Y
  const hookPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, railAbove * 0.45, 0)]
  const hookRadius = RAIL_RADIUS + 0.008
  for (let step = 0; step <= 14; step += 1) {
    const angle = THREE.MathUtils.degToRad(-35 + (step / 14) * 245)
    hookPoints.push(new THREE.Vector3(Math.cos(angle) * hookRadius, railAbove + Math.sin(angle) * hookRadius, 0))
  }
  const hook = new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hookPoints), 48, 0.0055, 8)), chrome)
  hook.castShadow = true
  group.add(hook)

  const bar = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.28, -0.066, 0),
    new THREE.Vector3(-0.2, -0.04, 0),
    new THREE.Vector3(-0.08, -0.012, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.08, -0.012, 0),
    new THREE.Vector3(0.2, -0.04, 0),
    new THREE.Vector3(0.28, -0.066, 0),
  ])
  const shoulders = new THREE.Mesh(track(new THREE.TubeGeometry(bar, 40, 0.012, 10)), plastic)
  shoulders.castShadow = true
  group.add(shoulders)
  ;[-1, 1].forEach((sideSign) => {
    const tip = new THREE.Mesh(track(new THREE.SphereGeometry(0.016, 12, 8)), plastic)
    tip.position.set(sideSign * 0.28, -0.066, 0)
    group.add(tip)
  })
  const neck = new THREE.Mesh(track(new RoundedBoxGeometry(0.05, 0.03, 0.03, 2, 0.01)), plastic)
  neck.position.y = -0.004
  group.add(neck)
  return group
}

/** Pegboard in the y–z plane, facing −x: matte black steel with real holes cut by alpha. */
function createPegboard(track: Track, width: number, height: number) {
  const material = standard({ color: 0x1b1c1e, roughness: 0.55, metalness: 0.45, side: THREE.DoubleSide }, 'Pegboard steel')
  track(material)
  if (canPaint()) {
    const [canvas, g] = createCanvas(64, 64)
    g.fillStyle = '#fff'
    g.fillRect(0, 0, 64, 64)
    g.fillStyle = '#000'
    g.beginPath()
    g.arc(32, 32, 10, 0, Math.PI * 2)
    g.fill()
    const holes = track(toTexture(canvas, false))
    holes.wrapS = holes.wrapT = THREE.RepeatWrapping
    holes.repeat.set(width / 0.055, height / 0.055)
    material.alphaMap = holes
    material.alphaTest = 0.5
  }
  const board = new THREE.Mesh(track(new THREE.PlaneGeometry(width, height)), material)
  board.rotation.y = -Math.PI / 2
  board.name = 'RACK_Pegboard'
  board.castShadow = true
  board.receiveShadow = true
  return board
}

/** Badminton racket hanging flat against the pegboard, facing −x; origin at the top of the head. */
function createRacket(track: Track, frameColor: number, gripColor: number) {
  const group = new THREE.Group()
  group.name = 'RACK_Racket'
  const frame = track(standard({ color: frameColor, roughness: 0.28, metalness: 0.35 }, 'Racket frame'))
  const shaftMaterial = track(standard({ color: 0x2b2d31, roughness: 0.25, metalness: 0.7 }, 'Racket shaft'))
  const grip = track(standard({ color: gripColor, roughness: 0.85, metalness: 0 }, 'Racket grip'))
  const radiusZ = 0.165
  const radiusY = 0.215
  const headCenterY = -radiusY

  const rim = Array.from({ length: 48 }, (_, index) => {
    const a = (index / 48) * Math.PI * 2
    return new THREE.Vector3(0, headCenterY + Math.cos(a) * radiusY, Math.sin(a) * radiusZ)
  })
  const head = new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 96, 0.009, 8, true)), frame)
  head.castShadow = true
  group.add(head)

  // Strings: an elliptical sheet whose string pattern is cut out by alpha.
  const stringMaterial = track(standard({ color: 0xf2f2ee, roughness: 0.6, side: THREE.DoubleSide }, 'Racket strings'))
  if (canPaint()) {
    const [canvas, g] = createCanvas(256, 256)
    g.fillStyle = '#000'
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = '#fff'
    for (let line = 3; line < 256; line += 9) {
      g.fillRect(line, 0, 2.2, 256)
      g.fillRect(0, line, 256, 2.2)
    }
    stringMaterial.alphaMap = track(toTexture(canvas, false))
    stringMaterial.alphaTest = 0.4
  }
  const shape = new THREE.Shape()
  shape.absellipse(0, 0, radiusZ - 0.004, radiusY - 0.004, 0, Math.PI * 2, false, 0)
  const sheetGeometry = track(new THREE.ShapeGeometry(shape, 48))
  // ShapeGeometry uv equals position; normalise to 0..1 over the ellipse.
  const uv = sheetGeometry.getAttribute('uv')
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) / (radiusZ * 2) + 0.5, uv.getY(index) / (radiusY * 2) + 0.5)
  }
  const sheet = new THREE.Mesh(sheetGeometry, stringMaterial)
  sheet.rotation.y = -Math.PI / 2
  sheet.position.y = headCenterY
  group.add(sheet)

  // Throat, shaft and handle hang straight down below the head.
  const throatTop = headCenterY - radiusY
  const throat = new THREE.Mesh(track(new THREE.CylinderGeometry(0.008, 0.006, 0.06, 10)), frame)
  throat.position.y = throatTop - 0.03
  group.add(throat)
  const shaftLength = 0.42
  const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.0055, 0.0055, shaftLength, 10)), shaftMaterial)
  shaft.position.y = throatTop - 0.06 - shaftLength / 2
  shaft.castShadow = true
  group.add(shaft)
  const handleTop = throatTop - 0.06 - shaftLength
  const ferrule = new THREE.Mesh(track(new THREE.CylinderGeometry(0.0055, 0.016, 0.03, 16)), frame)
  ferrule.position.y = handleTop - 0.015
  group.add(ferrule)
  const handle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.0165, 0.018, 0.3, 16)), grip)
  handle.position.y = handleTop - 0.03 - 0.15
  handle.castShadow = true
  group.add(handle)
  const cap = new THREE.Mesh(track(new THREE.CylinderGeometry(0.019, 0.019, 0.012, 16)), frame)
  cap.position.y = handleTop - 0.336
  group.add(cap)
  return group
}

/** Over-ear headphones hanging from a peg by the headband; cups face along z. */
function createHeadphones(track: Track) {
  const group = new THREE.Group()
  group.name = 'RACK_Headphones'
  const shell = track(standard({ color: 0x1a1a1c, roughness: 0.4, metalness: 0.2 }, 'Headphone shell'))
  const accent = track(standard({ color: 0xb8231f, roughness: 0.35, metalness: 0.3 }, 'Headphone accent'))
  const cushion = track(standard({ color: 0x232325, roughness: 0.9 }, 'Headphone cushion'))
  const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.075, 0.009, 8, 32, Math.PI)), shell)
  band.rotation.y = Math.PI / 2
  group.add(band)
  ;[-1, 1].forEach((sideSign) => {
    const yoke = new THREE.Mesh(track(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6)), accent)
    yoke.position.set(0, -0.025, sideSign * 0.075)
    group.add(yoke)
    const cup = new THREE.Mesh(track(new THREE.CylinderGeometry(0.042, 0.04, 0.028, 28)), accent)
    cup.rotation.x = Math.PI / 2
    cup.position.set(0, -0.075, sideSign * 0.068)
    cup.castShadow = true
    group.add(cup)
    const pad = new THREE.Mesh(track(new THREE.TorusGeometry(0.03, 0.011, 8, 24)), cushion)
    pad.position.set(0, -0.075, sideSign * 0.05)
    group.add(pad)
  })
  return group
}

/** Shaker bottle: a turned body with a printed band and a screw cap. */
function createBottle(track: Track) {
  const group = new THREE.Group()
  group.name = 'RACK_Bottle'
  const body = track(standard({ color: 0xc8262a, roughness: 0.35, metalness: 0 }, 'Bottle body'))
  if (canPaint()) {
    const [canvas, g] = createCanvas(256, 128)
    g.fillStyle = '#c8262a'
    g.fillRect(0, 0, 256, 128)
    g.fillStyle = '#f3f1ec'
    g.fillRect(0, 44, 256, 40)
    g.fillStyle = '#c8262a'
    g.font = '900 26px "Arial Black", Arial, sans-serif'
    g.textAlign = 'center'
    g.fillText('HYDRATE', 128, 74)
    body.map = track(toTexture(canvas, true))
    body.color.set(0xffffff)
  }
  const profile: [number, number][] = [[0, 0], [0.04, 0], [0.044, 0.006], [0.046, 0.03], [0.044, 0.19], [0.04, 0.2], [0.03, 0.205]]
  const lathe = new THREE.Mesh(track(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32)), body)
  lathe.castShadow = true
  group.add(lathe)
  const cap = new THREE.Mesh(track(new THREE.CylinderGeometry(0.032, 0.034, 0.04, 24)), track(standard({ color: 0x151515, roughness: 0.5 }, 'Bottle cap')))
  cap.position.y = 0.225
  cap.castShadow = true
  group.add(cap)
  return group
}

/** Folded gym towels, stacked. */
function createTowels(track: Track) {
  const group = new THREE.Group()
  group.name = 'RACK_Towels'
  const colors = [0xd9d6cf, 0x8d9aa5, 0xece9e2]
  colors.forEach((color, index) => {
    const towel = new THREE.Mesh(
      track(new RoundedBoxGeometry(0.26, 0.042, 0.17, 3, 0.018)),
      track(standard({ color, roughness: 0.98 }, 'Towel')),
    )
    towel.position.set((index % 2) * 0.006, 0.021 + index * 0.043, (index - 1) * 0.004)
    towel.castShadow = true
    towel.receiveShadow = true
    group.add(towel)
  })
  return group
}

/** Duffel bag lying on the base, long side along z, with a white diagonal band and handles. */
function createDuffel(track: Track) {
  const group = new THREE.Group()
  group.name = 'RACK_Duffel'
  const nylon = track(standard({ color: 0x141416, roughness: 0.55, metalness: 0.05 }, 'Duffel nylon'))
  if (canPaint()) {
    const [canvas, g] = createCanvas(512, 256)
    g.fillStyle = '#141416'
    g.fillRect(0, 0, 512, 256)
    g.fillStyle = '#ecebe6'
    g.beginPath()
    g.moveTo(150, 256)
    g.lineTo(260, 256)
    g.lineTo(390, 0)
    g.lineTo(280, 0)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.18)'
    g.setLineDash([5, 5])
    g.lineWidth = 2
    g.strokeRect(10, 10, 492, 236)
    nylon.map = track(toTexture(canvas, true))
    nylon.color.set(0xffffff)
  }
  const body = new THREE.Mesh(track(new RoundedBoxGeometry(0.4, 0.4, 0.72, 6, 0.12)), nylon)
  body.position.y = 0.2
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)
  const webbing = track(standard({ color: 0xecebe6, roughness: 0.8 }, 'Duffel webbing'))
  ;[-1, 1].forEach((sideSign) => {
    const handle = new THREE.Mesh(track(new THREE.TorusGeometry(0.12, 0.012, 8, 24, Math.PI)), webbing)
    handle.position.set(sideSign * 0.07, 0.395, 0)
    handle.rotation.y = Math.PI / 2
    handle.castShadow = true
    group.add(handle)
  })
  const zip = new THREE.Mesh(track(new THREE.BoxGeometry(0.012, 0.006, 0.58)), track(standard({ color: 0x3a3a3c, roughness: 0.4, metalness: 0.6 }, 'Zip')))
  zip.position.y = 0.401
  group.add(zip)
  return group
}

export function createSportsRack() {
  const group = new THREE.Group()
  group.name = SPORTS_RACK_NODE_NAME
  const disposables: { dispose: () => void }[] = []
  const track: Track = (item) => {
    disposables.push(item)
    return item
  }
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(track(geometry), material)
    mesh.name = name
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  const steel = track(standard({ color: 0x18191b, roughness: 0.42, metalness: 0.55 }, 'Rack powder-coated steel'))
  const walnut = track(standard({ color: 0xffffff, roughness: 0.55, metalness: 0 }, 'Rack walnut'))
  if (canPaint()) walnut.map = track(createWoodTexture(311, ['#2c1a10', '#5a3a24', '#7a5236']))
  else walnut.color.set(0x5a3a24)
  const plinth = track(standard({ color: 0x121213, roughness: 0.6, metalness: 0.1 }, 'Rack plinth'))
  const chrome = track(standard({ color: 0xd8dadd, roughness: 0.18, metalness: 1 }, 'Hanger chrome'))
  const hangerPlastic = track(standard({ color: 0x141414, roughness: 0.38, metalness: 0 }, 'Hanger plastic'))

  /** A box of wood whose grain runs along its longest horizontal side. */
  const woodBox = (width: number, height: number, depth: number, name: string, x: number, y: number, z: number) => {
    const alongZ = depth > width
    const geometry = new RoundedBoxGeometry(alongZ ? depth : width, height, alongZ ? width : depth, 3, Math.min(0.012, height / 3))
    const mesh = add(geometry, walnut, name, x, y, z)
    if (alongZ) mesh.rotation.y = Math.PI / 2
    return mesh
  }

  const bay = (b: { minX: number; maxX: number; minZ: number; maxZ: number }, name: string) => {
    const cx = (b.minX + b.maxX) / 2
    const cz = (b.minZ + b.maxZ) / 2
    const w = b.maxX - b.minX
    const d = b.maxZ - b.minZ
    add(new RoundedBoxGeometry(w - 0.06, PLINTH_TOP - FLOOR, d - 0.06, 2, 0.01), plinth, `${name}_Plinth`, cx, (FLOOR + PLINTH_TOP) / 2, cz)
    woodBox(w, BASE_TOP - PLINTH_TOP, d, `${name}_Base`, cx, (PLINTH_TOP + BASE_TOP) / 2, cz)
    woodBox(w - 0.02, SHELF_THICKNESS, d - 0.02, `${name}_TopShelf`, cx, SHELF_TOP - SHELF_THICKNESS / 2, cz)
  }

  const post = (x: number, z: number, name: string) => {
    const height = POST_TOP - BASE_TOP
    add(new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, height, 28), steel, name, x, BASE_TOP + height / 2, z)
    add(new THREE.CylinderGeometry(POST_RADIUS * 1.35, POST_RADIUS * 1.5, 0.03, 28), steel, `${name}_Foot`, x, BASE_TOP + 0.015, z)
    add(new THREE.SphereGeometry(POST_RADIUS * 1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), steel, `${name}_Cap`, x, POST_TOP, z)
    add(new THREE.CylinderGeometry(POST_RADIUS * 1.3, POST_RADIUS * 1.3, 0.02, 28), steel, `${name}_Collar`, x, SHELF_TOP + 0.01, z)
  }

  // Jersey bay.
  bay(JERSEY_BAY, 'RACK_JerseyBay')
  post(JERSEY_BAY.x, JERSEY_BAY.zBack, 'RACK_JerseyPostBack')
  post(JERSEY_BAY.x, JERSEY_BAY.zFront, 'RACK_JerseyPostFront')
  const railLength = JERSEY_BAY.zFront - JERSEY_BAY.zBack
  const rail = add(new THREE.CylinderGeometry(RAIL_RADIUS, RAIL_RADIUS, railLength, 20), steel, 'RACK_Rail', JERSEY_BAY.x, RAIL_Y, (JERSEY_BAY.zBack + JERSEY_BAY.zFront) / 2)
  rail.rotation.x = Math.PI / 2
  ;[JERSEY_BAY.zBack, JERSEY_BAY.zFront].forEach((z, index) => {
    const flange = add(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 20), steel, `RACK_RailFlange${index}`, JERSEY_BAY.x, RAIL_Y, z + (index ? -1 : 1) * 0.06)
    flange.rotation.x = Math.PI / 2
  })

  // Jerseys on hangers, facing +z, from the wall end to the front.
  const knit = canPaint() ? track(createKnitNormalTexture()) : null
  JERSEYS.forEach((design, index) => {
    const holder = new THREE.Group()
    holder.name = `RACK_Jersey_${design.id}`
    holder.position.set(JERSEY_BAY.x, HANGER_Y, JERSEY_Z[index])
    // Hangers never sit perfectly square on a rail.
    holder.rotation.y = (random(index + 40)() - 0.5) * 0.16
    holder.add(createHanger(track, hangerPlastic, chrome))
    const fabric = track(new THREE.MeshPhysicalMaterial({
      color: canPaint() ? 0xffffff : design.body,
      roughness: 0.78,
      metalness: 0,
      sheen: 0.6,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color(0xffffff),
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    }))
    fabric.name = `Jersey ${design.id}`
    if (canPaint()) {
      fabric.map = track(createJerseyTexture(design, index * 11 + 3))
      fabric.alphaToCoverage = true
    }
    if (knit) {
      fabric.normalMap = knit
      fabric.normalScale.set(0.18, 0.18)
    }
    ;(['front', 'back'] as const).forEach((side) => {
      const panel = new THREE.Mesh(track(createJerseyPanel(side, index)), fabric)
      panel.name = `RACK_Jersey_${side}`
      // Straps rest on the hanger's shoulders, just above the bar.
      panel.position.y = 0.006
      panel.castShadow = true
      panel.receiveShadow = true
      holder.add(panel)
    })
    group.add(holder)
  })

  // Pegboard bay.
  bay(PEG_BAY, 'RACK_PegBay')
  post(PEG_BAY.postX, PEG_BAY.zBack, 'RACK_PegPostBack')
  post(PEG_BAY.postX, PEG_BAY.zFront, 'RACK_PegPostFront')
  woodBox(PEG_BAY.maxX - PEG_BAY.minX - 0.02, 0.05, PEG_BAY.maxZ - PEG_BAY.minZ - 0.02, 'RACK_PegMidShelf', (PEG_BAY.minX + PEG_BAY.maxX) / 2, MID_SHELF_TOP - 0.025, (PEG_BAY.minZ + PEG_BAY.maxZ) / 2)
  const boardBottom = MID_SHELF_TOP + 0.04
  const boardTop = SHELF_TOP - SHELF_THICKNESS - 0.02
  const boardWidth = PEG_BAY.zFront - PEG_BAY.zBack - POST_RADIUS * 2
  const board = createPegboard(track, boardWidth, boardTop - boardBottom)
  board.position.set(BOARD_X, (boardTop + boardBottom) / 2, (PEG_BAY.zBack + PEG_BAY.zFront) / 2)
  group.add(board)
  // Board frame rails, top and bottom.
  ;[boardBottom, boardTop].forEach((y, index) => {
    add(new THREE.BoxGeometry(0.03, 0.03, boardWidth), steel, `RACK_BoardRail${index}`, BOARD_X + 0.012, y, (PEG_BAY.zBack + PEG_BAY.zFront) / 2)
  })

  const peg = (y: number, z: number) => {
    const mesh = add(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 8), chrome, 'RACK_Peg', BOARD_X - 0.035, y, z)
    mesh.rotation.z = Math.PI / 2 + 0.25
  }
  ;[
    { z: -2.47, frame: 0x1f4fa8, grip: 0xf1f1ec },
    { z: -2.07, frame: 0xc0232b, grip: 0xf1f1ec },
  ].forEach(({ z, frame, grip }) => {
    const racket = createRacket(track, frame, grip)
    racket.position.set(BOARD_X - 0.03, 3.22, z)
    group.add(racket)
    peg(3.22, z)
  })
  const headphones = createHeadphones(track)
  headphones.position.set(BOARD_X - 0.06, 1.74, -2.27)
  group.add(headphones)
  peg(1.74, -2.27)
  const bottle = createBottle(track)
  bottle.position.set(6.36, MID_SHELF_TOP, -2.5)
  group.add(bottle)
  const towels = createTowels(track)
  towels.position.set(6.34, MID_SHELF_TOP, -2.22)
  towels.rotation.y = Math.PI / 2 + 0.06
  group.add(towels)
  const duffel = createDuffel(track)
  duffel.position.set(6.33, BASE_TOP, -2.25)
  duffel.rotation.y = 0.04
  group.add(duffel)

  group.userData.dispose = () => disposables.forEach((item) => item.dispose())
  return group
}
