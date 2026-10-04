import * as THREE from 'three'

// Proportions inferred from the reference photo, in the existing room's model space.
export const FLOOR_LAMP = {
  position: [3.3, 0, -2.55] as [number, number, number],
  shadeCenter: 3.53,
  shadeHeight: 0.59,
  shadeRadius: 0.46,
  baseRadius: 0.285,
  stemRadius: 0.017,
}

export function createLinenTexture() {
  const size = 256
  const data = new Uint8Array(size * size * 4)
  let seed = 57
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const warp = Array.from({ length: size }, () => noise())
  const weft = Array.from({ length: size }, () => noise())
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const weave = ((x % 4 < 2) !== (y % 4 < 2)) ? 0.025 : -0.025
      const variation = 0.89 + warp[x] * 0.045 + weft[y] * 0.045 + noise() * 0.03 + weave
      const i = (y * size + x) * 4
      data[i] = Math.round(231 * variation)
      data[i + 1] = Math.round(217 * variation)
      data[i + 2] = Math.round(189 * variation)
      data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.name = 'Woven linen'
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 1)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

export function createFloorLampModel() {
  const group = new THREE.Group()
  group.name = 'ACCENT_FloorLamp'
  const linen = createLinenTexture()
  const bronze = new THREE.MeshStandardMaterial({ color: '#3b3025', metalness: 0.55, roughness: 0.43 })
  const brass = new THREE.MeshStandardMaterial({ color: '#8d7250', metalness: 0.65, roughness: 0.36 })
  const fabric = new THREE.MeshStandardMaterial({
    color: '#f2e9d7', map: linen, bumpMap: linen, bumpScale: 0.0015,
    roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
    emissive: '#ffe3b2', emissiveMap: linen, emissiveIntensity: 0,
    userData: { noHover: true },
  })
  const lining = new THREE.MeshStandardMaterial({
    color: '#eee4ce', roughness: 0.88, side: THREE.DoubleSide,
    emissive: '#ffe5bb', emissiveIntensity: 0, userData: { noHover: true },
  })
  const trim = new THREE.MeshStandardMaterial({ color: '#c6b792', roughness: 0.88 })
  const cable = new THREE.MeshStandardMaterial({ color: '#29241e', roughness: 0.9 })
  const materials = [bronze, brass, fabric, lining, trim, cable]
  const geometries: THREE.BufferGeometry[] = []
  const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, y = 0) => {
    geometries.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name
    mesh.position.y = y
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  // A concave trumpet profile, not a straight cone or a flat disc.
  const profile = [
    [0, 0.015], [0.26, 0.015], [FLOOR_LAMP.baseRadius, 0.027],
    [0.279, 0.05], [0.242, 0.18], [0.195, 0.38], [0.147, 0.61],
    [0.103, 0.83], [0.065, 1.05], [0.035, 1.22], [0.022, 1.34], [0, 1.34],
  ].map(([radius, y]) => new THREE.Vector2(radius, y))
  add('Bronze trumpet base', new THREE.LatheGeometry(profile, 64), bronze)
  const bottom = FLOOR_LAMP.shadeCenter - FLOOR_LAMP.shadeHeight / 2
  const top = FLOOR_LAMP.shadeCenter + FLOOR_LAMP.shadeHeight / 2
  add('Slender brass stem', new THREE.CylinderGeometry(FLOOR_LAMP.stemRadius, FLOOR_LAMP.stemRadius, bottom - 1.26, 20), brass, (bottom + 1.26) / 2)
  add('Shade collar', new THREE.CylinderGeometry(0.035, 0.027, 0.075, 24), brass, bottom - 0.013)
  add('Linen drum shade', new THREE.CylinderGeometry(FLOOR_LAMP.shadeRadius, FLOOR_LAMP.shadeRadius, FLOOR_LAMP.shadeHeight, 64, 1, true), fabric, FLOOR_LAMP.shadeCenter)
  add('Inner shade lining', new THREE.CylinderGeometry(0.449, 0.449, FLOOR_LAMP.shadeHeight - 0.018, 64, 1, true), lining, FLOOR_LAMP.shadeCenter)
  for (const [label, y] of [['Upper bound seam', top], ['Lower bound seam', bottom]] as const) {
    const ring = add(label, new THREE.TorusGeometry(0.455, 0.007, 6, 64), trim, y)
    ring.rotation.x = Math.PI / 2
  }
  const diffuser = add('Recessed lower diffuser', new THREE.CircleGeometry(0.444, 64), lining, bottom + 0.018)
  diffuser.rotation.x = Math.PI / 2
  const socket = add('Interior socket', new THREE.CylinderGeometry(0.042, 0.042, 0.13, 16), brass, bottom + 0.105)
  socket.castShadow = false
  for (let i = 0; i < 3; i += 1) {
    const angle = i * Math.PI * 2 / 3
    const rib = add('Shade support', new THREE.CylinderGeometry(0.005, 0.005, 0.43, 6), brass, bottom + 0.025)
    rib.position.set(Math.cos(angle) * 0.215, bottom + 0.025, Math.sin(angle) * 0.215)
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)))
  }
  const cordPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.03, -0.23), new THREE.Vector3(-0.16, 0.012, -0.4),
    new THREE.Vector3(-0.37, 0.012, -0.43), new THREE.Vector3(-0.48, 0.012, -0.38),
  ])
  const cord = add('Short power cord', new THREE.TubeGeometry(cordPath, 16, 0.006, 6, false), cable)
  cord.raycast = () => undefined

  return {
    group,
    setLight(level: number) {
      const on = THREE.MathUtils.clamp(level, 0, 1)
      fabric.emissiveIntensity = 0.48 * on
      lining.emissiveIntensity = 0.65 * on
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      linen.dispose()
    },
  }
}
