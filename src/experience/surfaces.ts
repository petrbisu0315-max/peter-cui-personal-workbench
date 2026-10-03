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

export const HANDWRITING = 'Caveat, "Bradley Hand", "Segoe Print", cursive'

/** Portrait whiteboard face: handwritten greeting, hand-drawn underline and a small prompt. */
export async function createWhiteboardTexture(width: number, height: number) {
  await Promise.all([
    document.fonts?.load(`700 120px ${HANDWRITING}`),
    document.fonts?.load(`500 60px ${HANDWRITING}`),
  ]).catch(() => undefined)
  const w = 1024
  const h = Math.round((w * height) / width)
  const [canvas, g] = createCanvas(w, h)
  const rand = random(7)

  g.fillStyle = '#f7f6f2'
  g.fillRect(0, 0, w, h)
  const sheen = g.createLinearGradient(0, 0, w, h)
  sheen.addColorStop(0, 'rgba(255,255,255,0.7)')
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)')
  sheen.addColorStop(1, 'rgba(214,214,208,0.35)')
  g.fillStyle = sheen
  g.fillRect(0, 0, w, h)
  // Faint ghosting left by earlier, erased notes.
  for (let index = 0; index < 10; index += 1) {
    g.strokeStyle = `rgba(130,134,142,${0.012 + rand() * 0.014})`
    g.lineWidth = 14 + rand() * 30
    g.lineCap = 'round'
    const x = rand() * w
    const y = h * 0.35 + rand() * h * 0.6
    g.beginPath()
    g.moveTo(x, y)
    g.bezierCurveTo(x + 80, y - 30 * rand(), x + 160, y + 30 * rand(), x + 120 + rand() * 200, y + (rand() - 0.5) * 50)
    g.stroke()
  }

  const parts = [
    { text: 'Welcome to ', color: '#2f3d68', scale: 1 },
    { text: "Peter's", color: '#a8482c', scale: 1.22 },
    { text: ' room', color: '#2f3d68', scale: 1 },
  ]
  let size = 130
  const measure = () => parts.reduce((total, part) => {
    g.font = `700 ${size * part.scale}px ${HANDWRITING}`
    return total + g.measureText(part.text).width
  }, 0)
  while (measure() > w * 0.84 && size > 40) size -= 2
  const lineWidth = measure()
  const baseline = h * 0.17
  let x = (w - lineWidth) / 2
  g.textBaseline = 'alphabetic'
  parts.forEach((part, index) => {
    g.font = `700 ${size * part.scale}px ${HANDWRITING}`
    const advance = g.measureText(part.text).width
    g.save()
    g.fillStyle = part.color
    g.translate(x, baseline + (index === 1 ? -4 : 0))
    g.rotate(index === 1 ? -0.025 : -0.008)
    g.fillText(part.text, 0, 0)
    g.restore()
    x += advance
  })

  const left = (w - lineWidth) / 2
  const right = left + lineWidth
  const underline = baseline + size * 0.32
  g.strokeStyle = 'rgba(168,72,44,0.85)'
  g.lineWidth = 6
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(left + 6, underline + 6)
  g.bezierCurveTo(left + lineWidth * 0.3, underline - 6, left + lineWidth * 0.7, underline + 10, right - 10, underline - 2)
  g.stroke()
  g.beginPath()
  g.moveTo(right - 40, underline - 20)
  g.lineTo(right - 8, underline - 2)
  g.lineTo(right - 42, underline + 14)
  g.stroke()

  g.font = `500 ${Math.round(size * 0.46)}px ${HANDWRITING}`
  g.fillStyle = '#6a6964'
  g.textAlign = 'center'
  g.fillText('You can write down anything you want', w / 2, underline + size * 0.78)
  g.textAlign = 'start'

  return toTexture(canvas, true)
}

/** Heathered loop-pile rug in terracotta, with a darker bound edge. Returns colour and bump maps. */
export function createRugTextures(width: number, depth: number) {
  const w = 1536
  const h = Math.round((w * depth) / width)
  const [canvas, g] = createCanvas(w, h)
  const [bumpCanvas, b] = createCanvas(w, h)
  const rand = random(53)
  const yarns: [number, number, number, number][] = [
    [178, 96, 78, 0.4],
    [190, 116, 98, 0.26],
    [160, 80, 62, 0.22],
    [200, 150, 126, 0.08],
    [112, 78, 68, 0.03],
    [218, 190, 168, 0.01],
  ]
  const pick = () => {
    let roll = rand()
    for (const yarn of yarns) {
      roll -= yarn[3]
      if (roll <= 0) return yarn
    }
    return yarns[0]
  }
  const color = g.createImageData(w, h)
  const bump = b.createImageData(w, h)
  const loop = 3
  const binding = Math.round(w * 0.012)
  for (let row = 0; row < h; row += loop) {
    const shift = (row / loop) % 2 ? 1 : 0
    for (let column = -shift; column < w; column += 2) {
      const [r, gr, bl] = pick()
      const light = 0.92 + rand() * 0.14
      const height = 150 + rand() * 80
      for (let dy = 0; dy < loop; dy += 1) {
        // Each loop is brightest at its crown and darker where it meets the backing.
        const crown = dy === 1 ? 1.06 : dy === 0 ? 0.97 : 0.84
        for (let dx = 0; dx < 2; dx += 1) {
          const px = column + dx
          const py = row + dy
          if (px < 0 || px >= w || py >= h) continue
          const edge = px < binding || py < binding || px >= w - binding || py >= h - binding
          const tone = light * crown * (edge ? 0.7 : 1)
          const offset = (py * w + px) * 4
          color.data[offset] = Math.min(255, r * tone)
          color.data[offset + 1] = Math.min(255, gr * tone)
          color.data[offset + 2] = Math.min(255, bl * tone)
          color.data[offset + 3] = 255
          const value = Math.min(255, height * crown * (edge ? 1.12 : 1))
          bump.data[offset] = bump.data[offset + 1] = bump.data[offset + 2] = value
          bump.data[offset + 3] = 255
        }
      }
    }
  }
  g.putImageData(color, 0, 0)
  b.putImageData(bump, 0, 0)
  // Stitch line just inside the binding.
  g.strokeStyle = 'rgba(70,34,26,0.45)'
  g.lineWidth = 2
  g.setLineDash([10, 7])
  g.strokeRect(binding + 5, binding + 5, w - (binding + 5) * 2, h - (binding + 5) * 2)
  // Soft wear in the middle, where the chair rolls.
  const wear = g.createRadialGradient(w * 0.55, h * 0.72, 0, w * 0.55, h * 0.72, w * 0.32)
  wear.addColorStop(0, 'rgba(240,220,200,0.08)')
  wear.addColorStop(1, 'rgba(240,220,200,0)')
  g.fillStyle = wear
  g.fillRect(0, 0, w, h)
  return { map: toTexture(canvas, true), bumpMap: toTexture(bumpCanvas, false) }
}
