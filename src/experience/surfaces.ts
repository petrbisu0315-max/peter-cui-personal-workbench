import * as THREE from 'three'

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
