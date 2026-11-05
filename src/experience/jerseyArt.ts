import * as THREE from 'three'
import { createCanvas, random, toTexture } from './surfaces'

/**
 * Printed faces for the jerseys on the clothes rack: five classic NBA uniforms.
 *
 * Each jersey gets one canvas, front on the left half and back on the right half. Drawing is
 * done in "design units" of a millimetre-like 1/1000 of a room unit, so lettering keeps its
 * proportions even though the canvas stretches differently across and down the jersey.
 * Alpha outside the silhouette cuts the armholes and the neck out of the flat panels.
 */

export type JerseyDesign = {
  id: string
  body: string
  /** Outer binding at the neck and armholes, then the stripe inside it. */
  trim: [string, string]
  wordmark: string
  wordmarkStyle: 'arch' | 'straight' | 'italic'
  /** Letter fill, then outlines from inner to outer. */
  letter: string
  outlines: string[]
  number: string
  name: string
  pinstripe?: string
  sidePanel?: string
  star?: string
}

export const JERSEYS: JerseyDesign[] = [
  {
    id: 'bulls-95-alternate',
    body: '#111112',
    trim: ['#c8102e', '#f4f4f4'],
    wordmark: 'CHICAGO',
    wordmarkStyle: 'arch',
    letter: '#c8102e',
    outlines: ['#f4f4f4', '#111112'],
    number: '23',
    name: 'JORDAN',
    pinstripe: 'rgba(200,16,46,0.55)',
  },
  {
    id: 'suns-orange',
    body: '#e9661f',
    trim: ['#2c1a5c', '#f4f4f4'],
    wordmark: 'PHOENIX',
    wordmarkStyle: 'arch',
    letter: '#2c1a5c',
    outlines: ['#f4f4f4'],
    number: '13',
    name: 'NASH',
    sidePanel: '#2c1a5c',
  },
  {
    id: 'lakers-gold',
    body: '#f2b630',
    trim: ['#4b2683', '#f4f4f4'],
    wordmark: 'LAKERS',
    wordmarkStyle: 'italic',
    letter: '#4b2683',
    outlines: ['#f4f4f4'],
    number: '24',
    name: 'BRYANT',
  },
  {
    id: 'sixers-red',
    body: '#c4122f',
    trim: ['#002b5c', '#f4f4f4'],
    wordmark: 'SIXERS',
    wordmarkStyle: 'straight',
    letter: '#f4f4f4',
    outlines: ['#002b5c', '#c9a14a'],
    number: '3',
    name: 'IVERSON',
    sidePanel: '#002b5c',
    star: '#002b5c',
  },
  {
    id: 'heat-black',
    body: '#0f0f10',
    trim: ['#d8202c', '#f9a01b'],
    wordmark: 'MIAMI',
    wordmarkStyle: 'arch',
    letter: '#d8202c',
    outlines: ['#f9a01b', '#0f0f10'],
    number: '6',
    name: 'JAMES',
  },
]

/** Jersey size in room units: chest width and shoulder-to-hem length. */
export const JERSEY_WIDTH = 0.65
export const JERSEY_LENGTH = 1.72
const HALF = (JERSEY_WIDTH * 1000) / 2
const LENGTH = JERSEY_LENGTH * 1000

/** Outline of a tank top in design units, x across (−HALF..HALF), y down from the strap tops. */
function jerseyOutline(side: 'front' | 'back') {
  const neckDepth = side === 'front' ? 0.2 : 0.085
  const p = (x: number, y: number): [number, number] => [x * HALF, y * LENGTH]
  return {
    neck: [p(-0.27, 0), p(-0.24, neckDepth * 0.6), p(-0.12, neckDepth), p(0, neckDepth), p(0.12, neckDepth), p(0.24, neckDepth * 0.6), p(0.27, 0)],
    armRight: [p(0.5, 0), p(0.53, 0.16), p(0.72, 0.3), p(0.97, 0.32)],
    armLeft: [p(-0.97, 0.32), p(-0.72, 0.3), p(-0.53, 0.16), p(-0.5, 0)],
    hemY: 0.985 * LENGTH,
  }
}

function silhouette(g: CanvasRenderingContext2D, side: 'front' | 'back') {
  const { neck, armRight, armLeft, hemY } = jerseyOutline(side)
  g.beginPath()
  g.moveTo(-0.5 * HALF, 0)
  g.lineTo(neck[0][0], neck[0][1])
  g.bezierCurveTo(neck[1][0], neck[1][1], neck[2][0], neck[2][1], neck[3][0], neck[3][1])
  g.bezierCurveTo(neck[4][0], neck[4][1], neck[5][0], neck[5][1], neck[6][0], neck[6][1])
  g.lineTo(armRight[0][0], armRight[0][1])
  g.bezierCurveTo(armRight[1][0], armRight[1][1], armRight[2][0], armRight[2][1], armRight[3][0], armRight[3][1])
  g.bezierCurveTo(0.99 * HALF, 0.55 * LENGTH, HALF, 0.8 * LENGTH, HALF, hemY - 8)
  g.quadraticCurveTo(0, hemY + 22, -HALF, hemY - 8)
  g.bezierCurveTo(-HALF, 0.8 * LENGTH, -0.99 * HALF, 0.55 * LENGTH, armLeft[0][0], armLeft[0][1])
  g.bezierCurveTo(armLeft[1][0], armLeft[1][1], armLeft[2][0], armLeft[2][1], armLeft[3][0], armLeft[3][1])
  g.closePath()
}

/** The neck and both armholes as open paths, for the ribbed binding. */
function openings(g: CanvasRenderingContext2D, side: 'front' | 'back') {
  const { neck, armRight, armLeft } = jerseyOutline(side)
  g.beginPath()
  g.moveTo(neck[0][0], neck[0][1])
  g.bezierCurveTo(neck[1][0], neck[1][1], neck[2][0], neck[2][1], neck[3][0], neck[3][1])
  g.bezierCurveTo(neck[4][0], neck[4][1], neck[5][0], neck[5][1], neck[6][0], neck[6][1])
  g.moveTo(armRight[0][0], armRight[0][1])
  g.bezierCurveTo(armRight[1][0], armRight[1][1], armRight[2][0], armRight[2][1], armRight[3][0], armRight[3][1])
  g.moveTo(armLeft[0][0], armLeft[0][1])
  g.bezierCurveTo(armLeft[1][0], armLeft[1][1], armLeft[2][0], armLeft[2][1], armLeft[3][0], armLeft[3][1])
}

const BLOCK = '"Arial Black", "Helvetica Neue", Arial, sans-serif'
const SLAB = 'Rockwell, "Roboto Slab", "Arial Black", Georgia, serif'

/** Tackle-twill lettering: outlines first from outer to inner, then the fill. */
function twill(g: CanvasRenderingContext2D, design: JerseyDesign, draw: (mode: 'stroke' | 'fill') => void, weight: number) {
  g.lineJoin = 'round'
  g.miterLimit = 2
  const layers = [...design.outlines].reverse()
  layers.forEach((color, index) => {
    g.strokeStyle = color
    g.lineWidth = weight * (layers.length - index) * 2
    draw('stroke')
  })
  g.fillStyle = design.letter
  draw('fill')
}

function archText(g: CanvasRenderingContext2D, text: string, centerY: number, radius: number, size: number, font: string, mode: 'stroke' | 'fill', squeeze = 0.86) {
  g.font = `900 ${size}px ${font}`
  const widths = [...text].map((letter) => g.measureText(letter).width * squeeze)
  const tracking = size * 0.04
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * (text.length - 1)
  let angle = -total / radius / 2
  ;[...text].forEach((letter, index) => {
    const half = widths[index] / 2
    angle += half / radius
    g.save()
    g.translate(Math.sin(angle) * radius, centerY + radius - Math.cos(angle) * radius)
    g.rotate(angle)
    g.scale(squeeze, 1)
    g.textAlign = 'center'
    g.textBaseline = 'alphabetic'
    if (mode === 'stroke') g.strokeText(letter, 0, 0)
    else g.fillText(letter, 0, 0)
    g.restore()
    angle += (half + tracking) / radius
  })
}

function straightText(g: CanvasRenderingContext2D, text: string, y: number, size: number, font: string, mode: 'stroke' | 'fill', options: { squeeze?: number; skew?: number; rise?: number } = {}) {
  const { squeeze = 0.86, skew = 0, rise = 0 } = options
  g.save()
  g.font = `900 ${size}px ${font}`
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.translate(0, y)
  g.rotate(-rise)
  g.transform(squeeze, 0, -skew, 1, 0, 0)
  if (mode === 'stroke') g.strokeText(text, 0, 0)
  else g.fillText(text, 0, 0)
  g.restore()
}

function star(g: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  g.beginPath()
  for (let index = 0; index < 10; index += 1) {
    const r = index % 2 ? radius * 0.42 : radius
    const a = (index / 10) * Math.PI * 2 - Math.PI / 2
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  g.closePath()
}

function drawSide(g: CanvasRenderingContext2D, design: JerseyDesign, side: 'front' | 'back', seed: number) {
  const rand = random(seed)
  g.save()
  silhouette(g, side)
  g.clip()
  g.fillStyle = design.body
  g.fillRect(-HALF - 10, -10, HALF * 2 + 20, LENGTH + 40)

  if (design.pinstripe) {
    g.strokeStyle = design.pinstripe
    g.lineWidth = 3
    for (let x = -HALF + 18; x < HALF; x += 46) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, LENGTH + 30)
      g.stroke()
    }
  }
  if (design.sidePanel) {
    g.fillStyle = design.sidePanel
    g.fillRect(-HALF - 10, 0.31 * LENGTH, 58, LENGTH)
    g.fillRect(HALF - 48, 0.31 * LENGTH, 58, LENGTH)
    g.fillStyle = design.trim[1]
    g.fillRect(-HALF + 48, 0.31 * LENGTH, 7, LENGTH)
    g.fillRect(HALF - 55, 0.31 * LENGTH, 7, LENGTH)
  }

  // Ribbed binding at the neck and armholes: an inner stripe, then the edge colour over it.
  openings(g, side)
  g.lineCap = 'round'
  g.strokeStyle = design.trim[1]
  g.lineWidth = 92
  g.stroke()
  g.strokeStyle = design.trim[0]
  g.lineWidth = 60
  g.stroke()
  // Rib texture across the binding.
  g.strokeStyle = 'rgba(0,0,0,0.12)'
  g.lineWidth = 2
  g.setLineDash([3, 5])
  g.lineWidth = 58
  g.stroke()
  g.setLineDash([])

  // Hem: a double-stitched turn-up.
  g.strokeStyle = 'rgba(0,0,0,0.22)'
  g.lineWidth = 2
  g.setLineDash([7, 5])
  g.beginPath()
  g.moveTo(-HALF, 0.955 * LENGTH)
  g.quadraticCurveTo(0, 0.985 * LENGTH, HALF, 0.955 * LENGTH)
  g.stroke()
  g.setLineDash([])

  if (side === 'front') {
    const wordY = design.wordmarkStyle === 'arch' ? 0.405 * LENGTH : 0.41 * LENGTH
    const size = design.wordmark.length > 6 ? 118 : 132
    if (design.star) {
      g.fillStyle = design.star
      star(g, 0, 0.255 * LENGTH, 30)
      g.fill()
    }
    twill(g, design, (mode) => {
      if (design.wordmarkStyle === 'arch') archText(g, design.wordmark, wordY, 820, size, design.id.startsWith('bulls') ? SLAB : BLOCK, mode)
      else if (design.wordmarkStyle === 'italic') straightText(g, design.wordmark, wordY, size + 8, BLOCK, mode, { skew: 0.22, rise: 0.07, squeeze: 0.84 })
      else straightText(g, design.wordmark, wordY, size, BLOCK, mode)
    }, 7)
    twill(g, design, (mode) => straightText(g, design.number, 0.62 * LENGTH, 300, BLOCK, mode, { squeeze: 0.8 }), 9)
    // League shield at the neck, jock tag at the hem.
    g.fillStyle = '#f4f4f4'
    g.fillRect(-15, 0.205 * LENGTH + 46, 30, 58)
    g.fillStyle = '#1d428a'
    g.fillRect(-11, 0.205 * LENGTH + 50, 11, 50)
    g.fillStyle = '#c8102e'
    g.fillRect(0, 0.205 * LENGTH + 50, 11, 50)
    g.fillStyle = '#151515'
    g.fillRect(-HALF + 70, 0.885 * LENGTH, 92, 62)
    g.fillStyle = '#e8e8e8'
    g.font = `700 30px ${BLOCK}`
    g.textAlign = 'center'
    g.fillText('48', -HALF + 116, 0.885 * LENGTH + 44)
  } else {
    twill(g, design, (mode) => archText(g, design.name, 0.19 * LENGTH, 900, 78, BLOCK, mode, 0.9), 5)
    twill(g, design, (mode) => straightText(g, design.number, 0.6 * LENGTH, 470, BLOCK, mode, { squeeze: 0.8 }), 11)
  }

  // Shading the fabric picks up on a hanger: darker under the arms and toward the side seams.
  const sides = g.createLinearGradient(-HALF, 0, HALF, 0)
  sides.addColorStop(0, 'rgba(0,0,0,0.28)')
  sides.addColorStop(0.18, 'rgba(0,0,0,0)')
  sides.addColorStop(0.82, 'rgba(0,0,0,0)')
  sides.addColorStop(1, 'rgba(0,0,0,0.28)')
  g.fillStyle = sides
  g.fillRect(-HALF, 0, HALF * 2, LENGTH + 30)

  // Mesh: rows of tiny holes and slubs in the knit.
  for (let y = 4; y < LENGTH; y += 6) {
    const offset = (y / 6) % 2 ? 3 : 0
    g.fillStyle = 'rgba(0,0,0,0.06)'
    for (let x = -HALF + offset; x < HALF; x += 6) g.fillRect(x, y, 2.2, 2.2)
  }
  for (let index = 0; index < 900; index += 1) {
    g.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    g.fillRect((rand() * 2 - 1) * HALF, rand() * LENGTH, 6 + rand() * 30, 1.5)
  }
  g.restore()
}

/** Front and back of one jersey on a single canvas: front on the left, back on the right. */
export function createJerseyTexture(design: JerseyDesign, seed: number) {
  const sideWidth = 512
  const height = 1024
  const [canvas, g] = createCanvas(sideWidth * 2, height)
  const sx = sideWidth / (HALF * 2)
  const sy = height / LENGTH
  ;(['front', 'back'] as const).forEach((side, index) => {
    g.setTransform(sx, 0, 0, sy, sideWidth * index + sideWidth / 2, 0)
    drawSide(g, design, side, seed + index)
  })
  g.setTransform(1, 0, 0, 1, 0, 0)
  const texture = toTexture(canvas, true)
  texture.anisotropy = 8
  return texture
}

/** Knit normal map, tiled many times over the jersey. */
export function createKnitNormalTexture() {
  const size = 64
  const [canvas, g] = createCanvas(size, size)
  const image = g.createImageData(size, size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Rounded loops in a brick arrangement; the normal is the slope of a cosine dome.
      const row = Math.floor(y / 8)
      const lx = ((x + (row % 2) * 4) % 8) / 8 - 0.5
      const ly = (y % 8) / 8 - 0.5
      const nx = -Math.sin(lx * Math.PI) * 0.55
      const ny = Math.sin(ly * Math.PI) * 0.55
      const offset = (y * size + x) * 4
      image.data[offset] = 128 + nx * 127
      image.data[offset + 1] = 128 + ny * 127
      image.data[offset + 2] = 255
      image.data[offset + 3] = 255
    }
  }
  g.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(40, 46)
  return texture
}
