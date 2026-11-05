import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import books from '../data/books.json'
import { createCanvas, createWoodTexture, random, toTexture } from './surfaces'

/**
 * Wall-mounted bookcase: two slotted standards, five teak shelves, books and a few objects.
 *
 * Replaces the scanned `PROP_Bookcase_GLB`, whose single 2K atlas left every spine a smear.
 * The shelves keep the scan's measured positions and outer bounds. Spines are painted into
 * one atlas, and the spines of the reading list's own books carry their real titles and
 * authors, in colours sampled from their covers. All books are one merged mesh.
 */

/** Hotspots resolve by object name: anything under this node opens the reading shelf. */
export const BOOKCASE_NODE_NAME = 'PROP_Bookcase_GLB'

/** Measured from the scan, in room coordinates. */
export const BOOKCASE_BOUNDS = { min: [-1.678, 2.487, -3.316], max: [0.955, 4.252, -2.984] } as const
const SHELF_LEFT = -1.683
const SHELF_RIGHT = 0.951
const SHELF_BACK = -3.29
const SHELF_FRONT = -2.986
const SHELF_THICKNESS = 0.054
/** Top surface of each shelf, top to bottom. */
export const SHELF_TOPS = [4.012, 3.685, 3.375, 3.05, 2.733]
const STANDARD_X = [-0.886, 0.48]
const STANDARD_WIDTH = 0.033
const STANDARD_DEPTH = 0.018

/** Spine colours sampled from the edge of each cover next to the spine. */
const SPINE_COLORS: Record<string, string> = {
  'weread-01': '#b3b0a9', 'weread-02': '#5b6c6a', 'weread-03': '#e8e6d4', 'weread-04': '#bebe07',
  'weread-05': '#b1d9dc', 'weread-06': '#656263', 'weread-07': '#0c0b0a', 'weread-08': '#118e5a',
  'weread-09': '#f6f6f6', 'weread-10': '#1fa5a4', 'weread-11': '#ea590e', 'weread-12': '#f3f1ef',
  'weread-13': '#3f3e35', 'weread-14': '#ebe1bc', 'weread-15': '#460511', 'weread-16': '#656147',
  'weread-17': '#c9cbcb', 'weread-18': '#65574f', 'weread-19': '#fbfbfb', 'weread-20': '#241a1a',
  'weread-21': '#dfded3', 'weread-22': '#b33e36', 'weread-23': '#197f84', 'weread-24': '#b2c6c6',
  'weread-25': '#6c8da9', 'weread-26': '#ddcaa7', 'weread-27': '#c4a287', 'weread-28': '#f7f6f2',
  'weread-29': '#a98577', 'weread-30': '#edede0', 'weread-31': '#f7f6f2', 'weread-32': '#b6b8c1',
  'weread-33': '#acc297', 'weread-34': '#212121', 'weread-35': '#f7f6f2',
}

/** Unlabelled books: mostly the off-white of Chinese paperbacks, with some cloth colours. */
const GENERIC_COLORS: [string, number][] = [
  ['#efebe2', 18], ['#f6f4ef', 14], ['#dcd6c8', 8], ['#7d7a74', 4], ['#b9a88a', 4],
  ['#2b2b2d', 5], ['#1f3550', 5], ['#3d5f7a', 3], ['#8a2d24', 4], ['#a33a2b', 2],
  ['#c27b2c', 3], ['#4f6b5a', 3],
]

/** Characters for the small type on unlabelled spines. */
const GLYPHS = [...'中国社会文化史论与的现代城市传播媒介电影艺术哲学思想经济政治人类时间空间记忆世界语言写作研究导读集新闻理论批评小说诗歌散文日常生活权力身体技术平台观看叙事']

const ATLAS = 2048
const CELL_W = 40
const CELL_H = 340
const COLUMNS = Math.floor(ATLAS / CELL_W)
const ROWS = Math.floor(ATLAS / CELL_H)
export const ATLAS_CELLS = COLUMNS * ROWS

type Spine =
  | { kind: 'real'; title: string; author: string; color: string }
  | { kind: 'generic'; color: string; style: number }

export type BookPlacement = {
  width: number
  height: number
  depth: number
  /** Matrix placing a box centred at the origin. */
  matrix: THREE.Matrix4
  spine: Spine
}

type ShelfSegment = { shelf: number; from: number; to: number }

const luminance = (hex: string) => {
  const color = new THREE.Color(hex)
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b
}

/**
 * Where each book goes. Rows stand on shelves 1–4 (shelf 0 is the top board); the gaps in the
 * segments leave room for the horizontal stacks and objects added separately.
 */
export function planBooks(seed = 21): BookPlacement[] {
  const rand = random(seed)
  const pickGeneric = () => {
    let roll = rand() * GENERIC_COLORS.reduce((sum, [, weight]) => sum + weight, 0)
    for (const [color, weight] of GENERIC_COLORS) {
      roll -= weight
      if (roll <= 0) return color
    }
    return GENERIC_COLORS[0][0]
  }
  const real = books.map((book) => ({
    kind: 'real' as const,
    title: book.title.split(/[：:]/)[0],
    author: book.author.split(/[、，,]/)[0].replace(/（.*?）/g, ''),
    color: SPINE_COLORS[book.id] ?? '#efebe2',
  }))
  const segments: ShelfSegment[] = [
    { shelf: 1, from: -1.3, to: SHELF_RIGHT - 0.005 },
    { shelf: 2, from: -1.3, to: 0.555 },
    { shelf: 3, from: SHELF_LEFT + 0.005, to: -0.72 },
    { shelf: 3, from: 0.175, to: SHELF_RIGHT - 0.005 },
    { shelf: 4, from: SHELF_LEFT + 0.005, to: -1.205 },
    { shelf: 4, from: 0.215, to: SHELF_RIGHT - 0.005 },
  ]
  const totalLength = segments.reduce((sum, segment) => sum + segment.to - segment.from, 0)
  const out: BookPlacement[] = []
  let realIndex = 0
  let travelled = 0
  for (const segment of segments) {
    const surface = SHELF_TOPS[segment.shelf]
    const clearance = SHELF_TOPS[segment.shelf - 1] - SHELF_THICKNESS - surface
    let x = segment.from
    while (x < segment.to) {
      // Spread the real books evenly along the shelves rather than bunching them at the top.
      const due = realIndex < real.length && (travelled + x - segment.from) / totalLength >= realIndex / real.length
      const isReal = due
      const width = isReal ? 0.03 + rand() * 0.016 : 0.014 + rand() ** 1.4 * 0.03
      if (x + width > segment.to) {
        const room = segment.to - x
        // A last book leans into whatever space is left, as books do at the end of a row.
        if (room > 0.035) {
          const height = clearance * (0.78 + rand() * 0.1)
          const depth = 0.17 + rand() * 0.08
          const angle = Math.min(0.5, Math.asin(Math.min(1, (room - 0.024) / height)))
          const lean = new THREE.Matrix4()
            .makeTranslation(segment.to - 0.002, surface, SHELF_FRONT - 0.012 - depth / 2)
            .multiply(new THREE.Matrix4().makeRotationZ(angle))
            .multiply(new THREE.Matrix4().makeTranslation(-0.012, height / 2, 0))
          out.push({ width: 0.024, height, depth, matrix: lean, spine: { kind: 'generic', color: pickGeneric(), style: Math.floor(rand() * 4) } })
        }
        break
      }
      const height = Math.min(clearance - 0.012, clearance * (isReal ? 0.82 + rand() * 0.12 : 0.66 + rand() * 0.28))
      const depth = Math.min(SHELF_FRONT - SHELF_BACK - 0.02, 0.16 + rand() * 0.11)
      const front = SHELF_FRONT - 0.006 - rand() * 0.014
      const matrix = new THREE.Matrix4().makeTranslation(x + width / 2, surface + height / 2, front - depth / 2)
      // A slight wobble: books are never perfectly upright.
      matrix.multiply(new THREE.Matrix4().makeRotationZ((rand() - 0.5) * 0.012))
      out.push({
        width,
        height,
        depth,
        matrix,
        spine: isReal ? real[realIndex++] : { kind: 'generic', color: pickGeneric(), style: Math.floor(rand() * 4) },
      })
      x += width + (rand() < 0.08 ? 0.003 + rand() * 0.006 : 0.0008)
    }
    travelled += segment.to - segment.from
  }

  // Horizontal stacks, spines out.
  const stack = (shelf: number, left: number, right: number, count: number, colors?: string[]) => {
    let y = SHELF_TOPS[shelf]
    for (let index = 0; index < count; index += 1) {
      const thickness = 0.022 + rand() * 0.018
      const length = (right - left) * (0.86 + rand() * 0.12)
      const depth = 0.19 + rand() * 0.07
      const matrix = new THREE.Matrix4()
        .makeTranslation((left + right) / 2 + (rand() - 0.5) * 0.02, y + thickness / 2, SHELF_FRONT - 0.01 - depth / 2)
        .multiply(new THREE.Matrix4().makeRotationY((rand() - 0.5) * 0.06))
        .multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2))
      out.push({ width: thickness, height: length, depth, matrix, spine: { kind: 'generic', color: colors?.[index] ?? pickGeneric(), style: Math.floor(rand() * 4) } })
      y += thickness
    }
  }
  stack(1, SHELF_LEFT + 0.01, -1.31, 6, ['#a92a26', '#1d1d1f', '#2b2b2d', '#efebe2', '#1d1d1f', '#2a2a2c'])
  stack(2, SHELF_LEFT + 0.01, -1.31, 7)
  stack(2, 0.565, SHELF_RIGHT - 0.01, 5, ['#1f3550', '#efebe2', '#f6f4ef', '#dcd6c8', '#efebe2'])
  stack(3, -0.68, -0.32, 4)
  return out
}

function drawSpine(g: CanvasRenderingContext2D, spine: Spine, width: number, height: number, rand: () => number) {
  // Drawing units are 1/1000 of a room unit, so lettering is not stretched by the cell.
  const w = width * 1000
  const h = height * 1000
  g.fillStyle = spine.color
  g.fillRect(0, 0, w, h)
  const dark = luminance(spine.color) > 0.55
  const ink = dark ? '#1f1e1c' : '#f3f0e8'
  // Paper and cloth both have a little tooth.
  for (let index = 0; index < 40; index += 1) {
    g.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    g.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 6)
  }
  // Rounded spine: darker at the edges where it turns into the covers.
  const turn = g.createLinearGradient(0, 0, w, 0)
  turn.addColorStop(0, 'rgba(0,0,0,0.22)')
  turn.addColorStop(0.18, 'rgba(0,0,0,0)')
  turn.addColorStop(0.82, 'rgba(0,0,0,0)')
  turn.addColorStop(1, 'rgba(0,0,0,0.22)')

  if (spine.kind === 'real') {
    const title = [...spine.title]
    const author = [...spine.author]
    const size = Math.min(w * 0.62, (h * 0.62) / title.length)
    g.fillStyle = ink
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `600 ${size}px "Songti SC", "Noto Serif SC", "Source Han Serif SC", SimSun, serif`
    title.forEach((char, index) => g.fillText(char, w / 2, h * 0.07 + size * (index + 0.55)))
    const small = Math.min(w * 0.4, (h * 0.2) / Math.max(1, author.length))
    g.font = `400 ${small}px "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`
    g.globalAlpha = 0.8
    const authorTop = h * 0.74
    author.slice(0, 8).forEach((char, index) => g.fillText(char, w / 2, authorTop + small * (index + 0.5)))
    g.globalAlpha = 1
    // Publisher's mark at the foot.
    g.fillStyle = ink
    g.globalAlpha = 0.7
    g.fillRect(w * 0.3, h - w * 0.55, w * 0.4, w * 0.25)
    g.globalAlpha = 1
  } else {
    const accent = dark ? ['#8a2d24', '#1f3550', '#2b2b2d', '#c27b2c'][spine.style] : ['#e9e2cf', '#c9a65a', '#f3f0e8', '#d0c6b0'][spine.style]
    if (spine.style % 2 === 0) {
      g.fillStyle = accent
      g.fillRect(0, h * 0.06, w, h * 0.035)
      g.fillRect(0, h * 0.86, w, h * 0.035)
    }
    if (spine.style === 1) {
      g.fillStyle = accent
      g.fillRect(0, h * 0.12, w, h * 0.22)
    }
    // Unlabelled books still carry type: a title and an author in small characters.
    g.fillStyle = spine.style === 1 ? (luminance(accent) > 0.55 ? '#2a2826' : '#f3f0e8') : ink
    g.globalAlpha = 0.82
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const glyphs = 3 + Math.floor(rand() * 5)
    const size = Math.min(w * 0.5, (h * 0.5) / glyphs, 17)
    const top = spine.style === 1 ? h * 0.13 + size * 0.2 : h * 0.13
    g.font = `500 ${size}px "Songti SC", "Noto Serif SC", "Source Han Serif SC", SimSun, serif`
    for (let index = 0; index < glyphs; index += 1) {
      g.fillText(GLYPHS[Math.floor(rand() * GLYPHS.length)], w / 2, top + size * (index + 0.6))
    }
    const small = Math.min(w * 0.34, 9)
    g.font = `400 ${small}px "PingFang SC", "Noto Sans SC", sans-serif`
    g.globalAlpha = 0.65
    for (let index = 0; index < 3; index += 1) g.fillText(GLYPHS[Math.floor(rand() * GLYPHS.length)], w / 2, h * 0.74 + small * (index + 0.5))
    g.globalAlpha = 1
  }
  g.fillStyle = turn
  g.fillRect(0, 0, w, h)
}

function paintAtlas(placements: BookPlacement[]) {
  const [canvas, g] = createCanvas(ATLAS, ATLAS)
  const rand = random(5)
  // Cell 0: page edges, cream with faint leaves.
  g.fillStyle = '#ece5d3'
  g.fillRect(0, 0, CELL_W, CELL_H)
  for (let y = 0; y < CELL_H; y += 2) {
    g.fillStyle = `rgba(120,100,70,${0.04 + rand() * 0.08})`
    g.fillRect(0, y, CELL_W, 1)
  }
  placements.forEach((book, index) => {
    const cell = index + 1
    const x = (cell % COLUMNS) * CELL_W
    const y = Math.floor(cell / COLUMNS) * CELL_H
    g.save()
    g.beginPath()
    g.rect(x, y, CELL_W, CELL_H)
    g.clip()
    g.setTransform(CELL_W / (book.width * 1000), 0, 0, CELL_H / (book.height * 1000), x, y)
    drawSpine(g, book.spine, book.width, book.height, rand)
    g.restore()
  })
  const texture = toTexture(canvas, true)
  texture.anisotropy = 8
  return texture
}

/** One box per book, merged; the spine (+z) gets the book's own cell of the atlas. */
export function createBooksGeometry(placements: BookPlacement[]) {
  const cellRect = (cell: number) => {
    const column = cell % COLUMNS
    const row = Math.floor(cell / COLUMNS)
    return { u0: (column * CELL_W) / ATLAS, u1: ((column + 1) * CELL_W) / ATLAS, v0: 1 - ((row + 1) * CELL_H) / ATLAS, v1: 1 - (row * CELL_H) / ATLAS }
  }
  const pages = cellRect(0)
  const pieces = placements.map((book, index) => {
    const geometry = new THREE.BoxGeometry(book.width, book.height, book.depth)
    const uv = geometry.getAttribute('uv')
    const spine = cellRect(index + 1)
    // Covers take a sliver at the spine's edge, so cloth colour and bands wrap round.
    const cover = { ...spine, u0: spine.u0 + 1 / ATLAS, u1: spine.u0 + 2 / ATLAS }
    for (let face = 0; face < 6; face += 1) {
      const rect = face === 4 ? spine : face <= 1 ? cover : pages
      for (let corner = 0; corner < 4; corner += 1) {
        const vertex = face * 4 + corner
        uv.setXY(vertex, rect.u0 + uv.getX(vertex) * (rect.u1 - rect.u0), rect.v0 + uv.getY(vertex) * (rect.v1 - rect.v0))
      }
    }
    geometry.applyMatrix4(book.matrix)
    return geometry
  })
  const merged = mergeGeometries(pieces)
  pieces.forEach((piece) => piece.dispose())
  return merged
}

function standard(options: THREE.MeshStandardMaterialParameters, name: string) {
  const material = new THREE.MeshStandardMaterial(options)
  material.name = name
  return material
}

export function createBookcase() {
  const group = new THREE.Group()
  group.name = BOOKCASE_NODE_NAME
  const canPaint = typeof document !== 'undefined'
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(item: T) => {
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

  const teak = track(standard({ color: canPaint ? 0xffffff : 0xa8692f, roughness: 0.5 }, 'Bookcase teak'))
  if (canPaint) teak.map = track(createWoodTexture(77, ['#6b3a17', '#a2632b', '#c48647'], 2048, 128))
  const bronze = track(standard({ color: 0x3b342d, roughness: 0.42, metalness: 0.75 }, 'Bookcase standard'))
  if (canPaint) {
    const [canvas, g] = createCanvas(16, 512)
    g.fillStyle = '#5a5249'
    g.fillRect(0, 0, 16, 512)
    g.fillStyle = '#0d0c0b'
    for (let y = 6; y < 512; y += 14) g.fillRect(6, y, 4, 9)
    bronze.map = track(toTexture(canvas, true))
    bronze.color.set(0xffffff)
  }

  // Slotted wall standards, full height, and a bracket under each shelf.
  const standardHeight = BOOKCASE_BOUNDS.max[1] - BOOKCASE_BOUNDS.min[1]
  STANDARD_X.forEach((x, index) => {
    add(new THREE.BoxGeometry(STANDARD_WIDTH, standardHeight, STANDARD_DEPTH), bronze, `BOOKCASE_Standard${index}`, x, BOOKCASE_BOUNDS.min[1] + standardHeight / 2, BOOKCASE_BOUNDS.min[2] + STANDARD_DEPTH / 2)
    SHELF_TOPS.forEach((top, shelf) => {
      add(new THREE.BoxGeometry(0.008, 0.032, SHELF_FRONT - SHELF_BACK - 0.03), bronze, `BOOKCASE_Bracket${index}_${shelf}`, x, top - SHELF_THICKNESS - 0.016, (SHELF_BACK + SHELF_FRONT) / 2 - 0.012)
    })
  })
  SHELF_TOPS.forEach((top, index) => {
    add(new RoundedBoxGeometry(SHELF_RIGHT - SHELF_LEFT, SHELF_THICKNESS, SHELF_FRONT - SHELF_BACK, 3, 0.007), teak, `BOOKCASE_Shelf${index}`, (SHELF_LEFT + SHELF_RIGHT) / 2, top - SHELF_THICKNESS / 2, (SHELF_BACK + SHELF_FRONT) / 2)
  })

  const placements = planBooks()
  const paper = track(standard({ color: canPaint ? 0xffffff : 0xece5d3, roughness: 0.82 }, 'Book paper'))
  if (canPaint) paper.map = track(paintAtlas(placements))
  add(createBooksGeometry(placements), paper, 'BOOKCASE_Books', 0, 0, 0)

  const loader = canPaint ? new THREE.TextureLoader() : null
  const image = (url: string) => {
    if (!loader) return null
    const texture = track(loader.load(url))
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return texture
  }

  // Shelf 3: a framed photograph from the city gallery, leaning against the wall.
  const frameW = 0.19
  const frameH = 0.25
  const frame = new THREE.Group()
  frame.name = 'BOOKCASE_Frame'
  const frameWood = track(standard({ color: 0x1c1a18, roughness: 0.45 }, 'Frame'))
  const frameMesh = new THREE.Mesh(track(new RoundedBoxGeometry(frameW, frameH, 0.018, 2, 0.004)), frameWood)
  frameMesh.castShadow = true
  frame.add(frameMesh)
  const mat = new THREE.Mesh(track(new THREE.PlaneGeometry(frameW - 0.024, frameH - 0.024)), track(standard({ color: 0xf4f1ea, roughness: 0.9 }, 'Mount')))
  mat.position.z = 0.0092
  frame.add(mat)
  const photo = new THREE.Mesh(
    track(new THREE.PlaneGeometry(frameW - 0.06, frameH - 0.072)),
    track(standard({ map: image('/images/cities/prague-02-c6c64fad-thumb.jpg'), color: canPaint ? 0xffffff : 0x8899aa, roughness: 0.35 }, 'Photo print')),
  )
  photo.position.set(0, 0.006, 0.0096)
  frame.add(photo)
  frame.position.set(-0.07, SHELF_TOPS[3] + frameH / 2 * Math.cos(0.1) + 0.001, SHELF_BACK + 0.06)
  frame.rotation.x = -0.1
  group.add(frame)

  // Shelf 4: a glazed bud vase, a face-out book, two river stones and a rattan basket.
  const glaze = track(new THREE.MeshPhysicalMaterial({ color: 0xe9e2d3, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }))
  glaze.name = 'Vase glaze'
  const vaseProfile: [number, number][] = [[0, 0], [0.026, 0], [0.032, 0.006], [0.042, 0.04], [0.04, 0.075], [0.02, 0.11], [0.014, 0.125], [0.018, 0.135], [0.015, 0.137]]
  add(new THREE.LatheGeometry(vaseProfile.map(([r, y]) => new THREE.Vector2(r, y)), 36), glaze, 'BOOKCASE_Vase', -1.135, SHELF_TOPS[4], -3.12)

  const coverBook = books.find((book) => book.id === 'weread-27') ?? books[0]
  const faceOut = new THREE.Group()
  faceOut.name = 'BOOKCASE_FaceOutBook'
  const coverW = 0.17
  const coverH = 0.235
  const coverMesh = new THREE.Mesh(
    track(new THREE.BoxGeometry(coverW, coverH, 0.022)),
    [
      ...Array.from({ length: 4 }, () => track(standard({ color: 0xece5d3, roughness: 0.85 }, 'Book block'))),
      track(standard({ map: image(coverBook.cover), color: canPaint ? 0xffffff : 0xc4a287, roughness: 0.6 }, 'Book cover')),
      track(standard({ color: 0xc4a287, roughness: 0.6 }, 'Book back')),
    ],
  )
  coverMesh.castShadow = true
  coverMesh.receiveShadow = true
  faceOut.add(coverMesh)
  faceOut.position.set(-0.86, SHELF_TOPS[4] + (coverH / 2) * Math.cos(0.12) + 0.001, SHELF_BACK + 0.045)
  faceOut.rotation.x = -0.12
  group.add(faceOut)

  const stone = track(standard({ color: 0x9a958c, roughness: 0.78 }, 'Stone'))
  ;[
    { x: -0.55, r: 0.055, squash: 0.55, seed: 3 },
    { x: -0.42, r: 0.04, squash: 0.6, seed: 9 },
  ].forEach(({ x, r, squash, seed }, index) => {
    const geometry = new THREE.IcosahedronGeometry(r, 4)
    const rand = random(seed)
    const bumps = Array.from({ length: 5 }, () => new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize())
    const position = geometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i)
      const n = vertex.clone().normalize()
      const lump = bumps.reduce((sum, b) => sum + Math.max(0, n.dot(b)) ** 3 * 0.12, 0)
      vertex.multiplyScalar(1 + lump)
      position.setXYZ(i, vertex.x * 1.25, vertex.y * squash, vertex.z)
    }
    geometry.computeVertexNormals()
    const mesh = add(geometry, stone, `BOOKCASE_Stone${index}`, x, SHELF_TOPS[4] + r * squash * 0.96, -3.1)
    mesh.rotation.y = seed
  })

  const rattan = track(standard({ color: canPaint ? 0xffffff : 0xb08a52, roughness: 0.85 }, 'Rattan'))
  if (canPaint) {
    const [canvas, g] = createCanvas(256, 256)
    g.fillStyle = '#7d5a2c'
    g.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 256; y += 8) {
      for (let x = 0; x < 256; x += 16) {
        const shift = (y / 8) % 2 ? 8 : 0
        const weave = g.createLinearGradient(x + shift, 0, x + shift + 14, 0)
        weave.addColorStop(0, '#9c7740')
        weave.addColorStop(0.5, '#d2b07a')
        weave.addColorStop(1, '#9c7740')
        g.fillStyle = weave
        g.fillRect(x + shift + 1, y + 1, 14, 6)
      }
    }
    const weaveTexture = track(toTexture(canvas, true))
    weaveTexture.wrapS = weaveTexture.wrapT = THREE.RepeatWrapping
    weaveTexture.repeat.set(4, 2)
    rattan.map = weaveTexture
  }
  add(new RoundedBoxGeometry(0.33, 0.15, 0.22, 3, 0.02), rattan, 'BOOKCASE_Basket', 0.005, SHELF_TOPS[4] + 0.075, -3.13)
  const handle = add(new THREE.TorusGeometry(0.06, 0.007, 8, 20, Math.PI), track(standard({ color: 0x1d1b19, roughness: 0.5 }, 'Basket handle')), 'BOOKCASE_BasketHandle', 0.005, SHELF_TOPS[4] + 0.15, -3.13)
  handle.castShadow = true

  group.userData.dispose = () => disposables.forEach((item) => item.dispose())
  return group
}
