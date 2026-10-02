import * as THREE from 'three'

function random(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return [canvas, canvas.getContext('2d')!] as const
}

function toTexture(canvas: HTMLCanvasElement, color: boolean) {
  const texture = new THREE.CanvasTexture(canvas)
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export type SurfaceTextures = { map: THREE.Texture; bumpMap: THREE.Texture }

/** Limewash plaster above an olive beadboard wainscot with an oak rail. Sizes are in model units. */
export function createWallTextures(width: number, height: number, wainscot: number): SurfaceTextures {
  const ppu = 2048 / width
  const w = 2048
  const h = Math.round(height * ppu)
  const [canvas, g] = createCanvas(w, h)
  const [bumpCanvas, b] = createCanvas(w, h)
  const rand = random(17)
  const panelTop = Math.round(h - wainscot * ppu)
  const railHeight = Math.round(0.09 * ppu)

  g.fillStyle = '#e8e0d2'
  g.fillRect(0, 0, w, panelTop)
  b.fillStyle = 'rgb(128,128,128)'
  b.fillRect(0, 0, w, h)
  for (let index = 0; index < 1100; index += 1) {
    const x = rand() * w
    const y = rand() * panelTop
    const radius = 24 + rand() * 150
    const light = rand() > 0.48
    const gradient = g.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, light ? 'rgba(252,248,240,0.2)' : 'rgba(190,172,146,0.13)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gradient
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }
  for (let index = 0; index < 320; index += 1) {
    const x = rand() * w
    const y = rand() * panelTop
    const length = 60 + rand() * 220
    g.strokeStyle = `rgba(176,158,130,${0.025 + rand() * 0.04})`
    g.lineWidth = 6 + rand() * 26
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + length * 0.5, y + (rand() - 0.5) * 70, x + length, y + (rand() - 0.5) * 40)
    g.stroke()
  }
  for (let index = 0; index < 14000; index += 1) {
    const shade = 104 + rand() * 48
    b.fillStyle = `rgb(${shade},${shade},${shade})`
    b.fillRect(rand() * w, rand() * panelTop, 2, 2)
  }

  g.fillStyle = '#4b5642'
  g.fillRect(0, panelTop, w, h - panelTop)
  const board = 0.22 * ppu
  for (let x = 0; x < w; x += board) {
    const tone = rand()
    g.fillStyle = `rgba(${tone > 0.5 ? '255,255,235' : '18,24,16'},${0.02 + rand() * 0.035})`
    g.fillRect(x, panelTop, board, h - panelTop)
    g.fillStyle = 'rgba(16,22,14,0.55)'
    g.fillRect(x, panelTop, 2, h - panelTop)
    g.fillStyle = 'rgba(240,240,214,0.08)'
    g.fillRect(x + 2, panelTop, 2, h - panelTop)
    b.fillStyle = 'rgb(46,46,46)'
    b.fillRect(x, panelTop, 3, h - panelTop)
  }
  const shadow = g.createLinearGradient(0, panelTop, 0, panelTop + 0.16 * ppu)
  shadow.addColorStop(0, 'rgba(12,14,10,0.42)')
  shadow.addColorStop(1, 'rgba(12,14,10,0)')
  g.fillStyle = shadow
  g.fillRect(0, panelTop, w, 0.16 * ppu)

  const skirting = Math.round(0.2 * ppu)
  g.fillStyle = '#343c2e'
  g.fillRect(0, h - skirting, w, skirting)
  g.fillStyle = 'rgba(232,226,200,0.14)'
  g.fillRect(0, h - skirting, w, 2)
  b.fillStyle = 'rgb(184,184,184)'
  b.fillRect(0, h - skirting, w, skirting)

  g.fillStyle = '#8b5e38'
  g.fillRect(0, panelTop - railHeight, w, railHeight)
  g.fillStyle = 'rgba(255,214,168,0.42)'
  g.fillRect(0, panelTop - railHeight, w, 2)
  g.fillStyle = 'rgba(40,22,10,0.5)'
  g.fillRect(0, panelTop - 3, w, 3)
  for (let index = 0; index < 90; index += 1) {
    g.fillStyle = `rgba(70,40,20,${0.08 + rand() * 0.12})`
    g.fillRect(rand() * w, panelTop - railHeight + rand() * railHeight, 40 + rand() * 160, 1)
  }
  b.fillStyle = 'rgb(214,214,214)'
  b.fillRect(0, panelTop - railHeight, w, railHeight)

  return { map: toTexture(canvas, true), bumpMap: toTexture(bumpCanvas, false) }
}

/** Pale oak herringbone; each band of the zigzag runs from the wall toward the camera. */
export function createFloorTextures(width: number, depth: number): SurfaceTextures {
  const ppu = 2048 / width
  const w = 2048
  const h = Math.round(depth * ppu)
  const [canvas, g] = createCanvas(w, h)
  const [bumpCanvas, b] = createCanvas(w, h)
  const rand = random(29)
  const plankWidth = 0.24 * ppu
  const plankLength = 1.2 * ppu
  const diagonal = Math.SQRT1_2
  g.fillStyle = '#6d5139'
  g.fillRect(0, 0, w, h)
  b.fillStyle = 'rgb(60,60,60)'
  b.fillRect(0, 0, w, h)

  const drawPlank = (x: number, y: number, pw: number, ph: number) => {
    const cx = (x + pw / 2 - (y + ph / 2)) * diagonal + w / 2
    const cy = (x + pw / 2 + (y + ph / 2)) * diagonal + h / 2
    if (cx < -plankLength || cx > w + plankLength || cy < -plankLength || cy > h + plankLength) return
    const hue = 29 + rand() * 7
    const saturation = 24 + rand() * 14
    const lightness = 58 + rand() * 13
    g.fillStyle = `hsl(${hue} ${saturation}% ${lightness}%)`
    g.fillRect(x, y, pw, ph)
    const horizontal = pw > ph
    const across = horizontal ? ph : pw
    const along = horizontal ? pw : ph
    for (let line = 0; line < 11; line += 1) {
      const offset = 2 + rand() * (across - 4)
      g.strokeStyle = `hsla(${hue - 5} ${saturation + 10}% ${lightness - 17}% / ${0.12 + rand() * 0.22})`
      g.lineWidth = 0.5 + rand() * 1.2
      g.beginPath()
      for (let step = 0; step <= 6; step += 1) {
        const a = (along * step) / 6
        const wobble = Math.sin(step * 1.7 + line) * rand() * 1.6
        const px = horizontal ? x + a : x + offset + wobble
        const py = horizontal ? y + offset + wobble : y + a
        if (step === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.stroke()
    }
    if (rand() > 0.82) {
      const kx = horizontal ? x + rand() * pw : x + pw / 2
      const ky = horizontal ? y + ph / 2 : y + rand() * ph
      g.fillStyle = `hsla(${hue - 6} 40% ${lightness - 26}% / 0.35)`
      g.beginPath()
      g.ellipse(kx, ky, horizontal ? 5 : 2.5, horizontal ? 2.5 : 5, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = 'rgba(78,54,34,0.58)'
    g.lineWidth = 1.3
    g.strokeRect(x + 0.6, y + 0.6, pw - 1.2, ph - 1.2)
    b.fillStyle = `rgb(${150 + rand() * 30},${150 + rand() * 30},${150 + rand() * 30})`
    b.fillRect(x + 1.5, y + 1.5, pw - 3, ph - 3)
  }

  const reach = Math.hypot(w, h)
  const kLimit = Math.ceil((reach * 1.5) / plankWidth)
  const mLimit = Math.ceil(reach / plankLength) + 2
  for (const context of [g, b]) {
    context.save()
    context.translate(w / 2, h / 2)
    context.rotate(Math.PI / 4)
  }
  for (let m = -mLimit; m <= mLimit; m += 1) {
    for (let k = -kLimit; k <= kLimit; k += 1) {
      const x = k * plankWidth - m * plankLength
      const y = k * plankWidth + m * plankLength
      drawPlank(x, y, plankLength, plankWidth)
      drawPlank(x + plankLength, y + plankWidth - plankLength, plankWidth, plankLength)
    }
  }
  g.restore()
  b.restore()
  return { map: toTexture(canvas, true), bumpMap: toTexture(bumpCanvas, false) }
}

/** Cream wool rug with a rust border and a faint diamond weave. */
export function createRugTexture() {
  const w = 1024
  const h = 700
  const [canvas, g] = createCanvas(w, h)
  const rand = random(41)
  g.fillStyle = '#e2d6c1'
  g.fillRect(0, 0, w, h)
  const border = 46
  g.fillStyle = '#9a4b30'
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#e2d6c1'
  g.fillRect(border, border, w - border * 2, h - border * 2)
  g.strokeStyle = '#2f2a26'
  g.lineWidth = 6
  g.strokeRect(border + 18, border + 18, w - (border + 18) * 2, h - (border + 18) * 2)
  g.save()
  g.beginPath()
  g.rect(border + 30, border + 30, w - (border + 30) * 2, h - (border + 30) * 2)
  g.clip()
  g.strokeStyle = 'rgba(70,58,48,0.2)'
  g.lineWidth = 3
  for (let x = -h; x < w + h; x += 64) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x + h, h)
    g.moveTo(x + h, 0)
    g.lineTo(x, h)
    g.stroke()
  }
  g.restore()
  for (let index = 0; index < 52000; index += 1) {
    const value = rand()
    g.fillStyle = value > 0.5 ? `rgba(255,250,238,${rand() * 0.16})` : `rgba(64,44,30,${rand() * 0.14})`
    g.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5)
  }
  return toTexture(canvas, true)
}

/** Soft four-pane window used as a sunlight / moonlight projection. */
export function createWindowGobo() {
  const size = 512
  const [canvas, g] = createCanvas(size, size)
  g.fillStyle = '#000'
  g.fillRect(0, 0, size, size)
  g.filter = 'blur(7px)'
  g.fillStyle = '#fff'
  const frame = 108
  const mullion = 18
  const paneW = (size - frame * 2 - mullion) / 2
  const paneH = (size - frame * 2 - mullion * 2) / 3
  for (let column = 0; column < 2; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      g.fillRect(frame + column * (paneW + mullion), frame + row * (paneH + mullion), paneW, paneH)
    }
  }
  g.filter = 'none'
  return toTexture(canvas, true)
}

export function createGlowTexture() {
  const [canvas, g] = createCanvas(128, 128)
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,226,170,1)')
  gradient.addColorStop(0.25, 'rgba(255,190,110,.45)')
  gradient.addColorStop(1, 'rgba(255,170,90,0)')
  g.fillStyle = gradient
  g.fillRect(0, 0, 128, 128)
  return toTexture(canvas, true)
}

/** Planar UVs chosen per face so the wall and floor slabs keep an undistorted texture on every side. */
export function applyPlanarUvs(geometry: THREE.BufferGeometry) {
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const size = box.getSize(new THREE.Vector3())
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  const uvs = new Float32Array(positions.count * 2)
  const facesWall = size.z < size.y
  for (let index = 0; index < positions.count; index += 1) {
    const x = (positions.getX(index) - box.min.x) / size.x
    const y = (positions.getY(index) - box.min.y) / size.y
    const z = (positions.getZ(index) - box.min.z) / size.z
    const nx = Math.abs(normals.getX(index))
    const ny = Math.abs(normals.getY(index))
    const nz = Math.abs(normals.getZ(index))
    let u: number
    let v: number
    if (facesWall) {
      u = nx > Math.max(ny, nz) ? z : x
      v = ny > Math.max(nx, nz) ? z : y
    } else {
      u = nx > Math.max(ny, nz) ? z : x
      v = ny > Math.max(nx, nz) ? 1 - z : y
    }
    uvs[index * 2] = u
    uvs[index * 2 + 1] = v
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}
