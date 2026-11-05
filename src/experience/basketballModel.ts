import * as THREE from 'three'
import { createCanvas, random, toTexture } from './surfaces'

/**
 * Composite-leather basketball: eight panels split by two great-circle channels and two curved
 * channels, a pebbled surface and a stamped panel mark.
 *
 * Replaces the scanned ball, which only had a blurred 2K atlas. Channels are located per pixel
 * from the sphere direction, so they stay continuous across the texture seam and the poles.
 */

export const BASKETBALL_NODE_NAME = 'SPORT_Basketball'
/** Centre and radius of the scanned ball, in room coordinates. */
export const BASKETBALL_CENTER: [number, number, number] = [6.2975, 0.617, -0.818]
export const BASKETBALL_RADIUS = 0.341

const CHANNEL_HALF_WIDTH = 0.024

/** Angular distance (radians) from a unit direction to the nearest channel centre line. */
export function channelDistance(x: number, y: number, z: number) {
  const equator = Math.abs(Math.asin(Math.max(-1, Math.min(1, y))))
  const meridian = Math.abs(Math.asin(Math.max(-1, Math.min(1, x))))
  // The curved channels loop around ±x, reaching furthest toward the ±y poles.
  const ring = Math.hypot(y, z)
  const sin2 = ring > 1e-6 ? (y / ring) ** 2 : 0
  const theta = Math.acos(Math.min(1, Math.abs(x)))
  const curved = Math.abs(theta - (0.74 + 0.5 * sin2))
  return Math.min(equator, meridian, curved)
}

function paintBall() {
  const width = 2048
  const height = 1024
  const [colorCanvas, color] = createCanvas(width, height)
  const [bumpCanvas, bump] = createCanvas(width, height)
  const rand = random(97)

  // Leather: warm orange with soft mottling.
  color.fillStyle = '#c4581f'
  color.fillRect(0, 0, width, height)
  for (let index = 0; index < 260; index += 1) {
    const x = rand() * width
    const y = rand() * height
    const r = 30 + rand() * 120
    const blotch = color.createRadialGradient(x, y, 0, x, y, r)
    const tone = rand() > 0.5 ? '160,62,22' : '214,112,52'
    blotch.addColorStop(0, `rgba(${tone},0.16)`)
    blotch.addColorStop(1, `rgba(${tone},0)`)
    color.fillStyle = blotch
    color.fillRect(x - r, y - r, r * 2, r * 2)
  }
  bump.fillStyle = '#585858'
  bump.fillRect(0, 0, width, height)

  // Pebbles: one row per pebble pitch in latitude, spaced evenly around each row.
  const sprite = createCanvas(16, 16)
  const glow = sprite[1].createRadialGradient(8, 8, 0, 8, 8, 8)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.55, 'rgba(255,255,255,0.65)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  sprite[1].fillStyle = glow
  sprite[1].fillRect(0, 0, 16, 16)
  const around = 420
  const pitch = width / around
  for (let row = 0; row * pitch * 0.5 < height; row += 1) {
    const py = row * pitch * 0.5 + pitch * 0.25
    const sinTheta = Math.max(0.12, Math.sin((py / height) * Math.PI))
    const count = Math.max(6, Math.round(around * sinTheta))
    const step = width / count
    const offset = (row % 2) * step * 0.5
    for (let index = 0; index < count; index += 1) {
      const px = offset + index * step + (rand() - 0.5) * step * 0.3
      const size = pitch * (0.85 + rand() * 0.3)
      bump.globalAlpha = 0.75 + rand() * 0.25
      bump.drawImage(sprite[0], px - size / sinTheta / 2, py - size / 2, size / sinTheta, size)
      color.globalAlpha = 0.07
      color.drawImage(sprite[0], px - size / sinTheta / 2, py - size / 2, size / sinTheta, size)
    }
  }
  bump.globalAlpha = 1
  color.globalAlpha = 1

  // Panel mark, stamped in black inside one panel.
  const stamp = (text: string, size: number, theta: number, phi: number, weight = 800) => {
    const sinTheta = Math.sin(theta)
    const cx = (phi / (Math.PI * 2)) * width
    const cy = (theta / Math.PI) * height
    color.save()
    color.translate(cx, cy)
    color.scale(1 / sinTheta, 1)
    color.font = `${weight} ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`
    color.textAlign = 'center'
    color.textBaseline = 'middle'
    color.fillStyle = 'rgba(20,14,10,0.88)'
    color.fillText(text, 0, 0)
    color.restore()
    bump.save()
    bump.translate(cx, cy)
    bump.scale(1 / sinTheta, 1)
    bump.font = color.font
    bump.textAlign = 'center'
    bump.textBaseline = 'middle'
    bump.fillStyle = 'rgba(40,40,40,0.9)'
    bump.fillText(text, 0, 0)
    bump.restore()
  }
  stamp('OFFICIAL', 34, 1.02, 1.12)
  stamp('GAME BALL', 52, 1.13, 1.12)
  stamp('INDOOR · OUTDOOR    7', 18, 1.24, 1.12, 700)

  // Channels: recessed black rubber, found per pixel from the sphere direction.
  const colorImage = color.getImageData(0, 0, width, height)
  const bumpImage = bump.getImageData(0, 0, width, height)
  for (let py = 0; py < height; py += 1) {
    const theta = ((py + 0.5) / height) * Math.PI
    const sinTheta = Math.sin(theta)
    const y = Math.cos(theta)
    for (let px = 0; px < width; px += 1) {
      const phi = ((px + 0.5) / width) * Math.PI * 2
      const distance = channelDistance(-Math.cos(phi) * sinTheta, y, Math.sin(phi) * sinTheta)
      if (distance > CHANNEL_HALF_WIDTH * 1.6) continue
      const offset = (py * width + px) * 4
      const inside = THREE.MathUtils.smoothstep(distance, CHANNEL_HALF_WIDTH * 0.85, CHANNEL_HALF_WIDTH * 1.15)
      // Leather rolls down into the channel, so its edge darkens before the rubber starts.
      const shoulder = THREE.MathUtils.smoothstep(distance, CHANNEL_HALF_WIDTH, CHANNEL_HALF_WIDTH * 1.6)
      for (let channel = 0; channel < 3; channel += 1) {
        const rubber = [24, 18, 14][channel]
        const leather = colorImage.data[offset + channel] * (0.72 + 0.28 * shoulder)
        colorImage.data[offset + channel] = rubber + (leather - rubber) * inside
      }
      const groove = 10 + (bumpImage.data[offset] * (0.5 + 0.5 * shoulder) - 10) * inside
      bumpImage.data[offset] = bumpImage.data[offset + 1] = bumpImage.data[offset + 2] = groove
    }
  }
  color.putImageData(colorImage, 0, 0)
  bump.putImageData(bumpImage, 0, 0)
  return { map: toTexture(colorCanvas, true), bumpMap: toTexture(bumpCanvas, false) }
}

export function createBasketball() {
  const group = new THREE.Group()
  group.name = BASKETBALL_NODE_NAME
  const geometry = new THREE.SphereGeometry(BASKETBALL_RADIUS, 96, 64)
  const material = new THREE.MeshStandardMaterial({ color: 0xc4581f, roughness: 0.66, metalness: 0 })
  material.name = 'Basketball composite leather'
  if (typeof document !== 'undefined') {
    const { map, bumpMap } = paintBall()
    material.map = map
    material.bumpMap = bumpMap
    material.bumpScale = 1.6
    material.color.set(0xffffff)
  }
  const ball = new THREE.Mesh(geometry, material)
  ball.name = 'SPORT_Basketball_Ball'
  ball.castShadow = true
  ball.receiveShadow = true
  // Turned so a curved channel and the panel mark face the room rather than the wall.
  ball.rotation.set(0.35, -0.1, 0.18)
  group.add(ball)
  group.position.set(...BASKETBALL_CENTER)
  group.userData.dispose = () => {
    geometry.dispose()
    material.map?.dispose()
    material.bumpMap?.dispose()
    material.dispose()
  }
  return group
}
