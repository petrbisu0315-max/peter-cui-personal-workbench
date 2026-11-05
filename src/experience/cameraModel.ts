import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * The desk camera, built from rounded primitives and lathe-turned dials and lens.
 *
 * The GLB camera was a 500,000-triangle scan; cutting it down for load time left the body's
 * flat plates and straight edges ragged. Rounded boxes and surfaces of revolution keep every
 * edge exact at a few thousand triangles.
 *
 * Frame: origin at the centre of the underside, +Y up, +Z toward the lens, +X to the right of
 * the camera as seen from the front. Units match the room model.
 */

/** Hotspots resolve by object name, so the modelled camera keeps the scanned one's. */
export const CAMERA_NODE_NAME = 'PROP_Camera_GLB'

export const BODY_WIDTH = 0.557
export const BODY_DEPTH = 0.22
const PLATE = 0.014
const LEATHER_TOP = 0.195
const DECK_TOP = 0.265
export const PRISM_TOP = 0.315
/** Optical axis height. */
const AXIS_Y = 0.112
const FRONT = BODY_DEPTH / 2
const BACK = -BODY_DEPTH / 2
export const LENS_LENGTH = 0.085

function material(options: THREE.MeshStandardMaterialParameters, name: string) {
  const result = new THREE.MeshStandardMaterial(options)
  result.name = name
  return result
}

/** A surface of revolution about the Z axis from (radius, z) pairs, starting at `z0`. */
function turned(profile: [number, number][], segments = 48) {
  const points = profile.map(([radius, z]) => new THREE.Vector2(radius, z))
  const geometry = new THREE.LatheGeometry(points, segments)
  geometry.rotateX(Math.PI / 2)
  return geometry
}

/** Ridges of a knurled ring, as a profile along the axis. */
function ribbed(radius: number, from: number, to: number, count: number, depth: number): [number, number][] {
  const out: [number, number][] = [[radius - depth, from]]
  const step = (to - from) / count
  for (let i = 0; i < count; i += 1) {
    const z = from + i * step
    out.push([radius, z + step * 0.15], [radius, z + step * 0.55], [radius - depth, z + step * 0.7])
  }
  out.push([radius - depth, to])
  return out
}

export function createCameraModel() {
  const group = new THREE.Group()
  group.name = CAMERA_NODE_NAME
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item)
    return item
  }

  const leather = track(material({ color: 0x18191c, metalness: 0.05, roughness: 0.82 }, 'Camera leatherette'))
  const silver = track(material({ color: 0xc6c9ce, metalness: 0.55, roughness: 0.36 }, 'Camera silver'))
  const darkMetal = track(material({ color: 0x25272b, metalness: 0.5, roughness: 0.4 }, 'Camera dark metal'))
  const lensBlack = track(material({ color: 0x111214, metalness: 0.3, roughness: 0.5 }, 'Camera lens barrel'))
  const accent = track(material({ color: 0xc8422b, metalness: 0.1, roughness: 0.45 }, 'Camera accent'))
  const glass = track(
    new THREE.MeshPhysicalMaterial({ color: 0x0b1018, metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
  )
  glass.name = 'Camera glass'

  const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, name: string, x: number, y: number, z: number) => {
    track(geometry)
    const mesh = new THREE.Mesh(geometry, mat)
    mesh.name = name
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const box = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r)

  // Body: silver base plate, black leatherette, silver top deck.
  add(box(BODY_WIDTH, PLATE, BODY_DEPTH, 0.006), silver, 'CAMERA_BasePlate', 0, PLATE / 2, 0)
  add(box(BODY_WIDTH - 0.002, LEATHER_TOP - PLATE, BODY_DEPTH - 0.002, 0.012), leather, 'CAMERA_Body', 0, (PLATE + LEATHER_TOP) / 2, 0)
  add(box(BODY_WIDTH, DECK_TOP - LEATHER_TOP, BODY_DEPTH, 0.01), silver, 'CAMERA_TopDeck', 0, (LEATHER_TOP + DECK_TOP) / 2, 0)

  // Right-hand grip, proud of the front face.
  add(box(0.07, 0.165, 0.05, 0.02), leather, 'CAMERA_Grip', -0.2415, 0.108, FRONT - 0.012)

  // Viewfinder prism with its hot shoe and eyepiece.
  add(box(0.17, PRISM_TOP - DECK_TOP + 0.008, 0.13, 0.022), silver, 'CAMERA_Prism', 0, (DECK_TOP + PRISM_TOP) / 2 - 0.004, -0.012)
  add(box(0.05, 0.005, 0.045, 0.002), darkMetal, 'CAMERA_HotShoe', 0, PRISM_TOP + 0.002, -0.012)
  add(box(0.062, 0.042, 0.018, 0.008), leather, 'CAMERA_Eyecup', -0.04, 0.275, BACK + 0.04)

  // Strap lugs at either end of the top deck.
  ;[-1, 1].forEach((side) => {
    add(box(0.016, 0.034, 0.034, 0.006), darkMetal, `CAMERA_Lug${side > 0 ? 'R' : 'L'}`, side * (BODY_WIDTH / 2 + 0.003), 0.222, 0)
  })

  // Back screen.
  add(box(0.31, 0.15, 0.006, 0.004), glass, 'CAMERA_Screen', 0.04, 0.108, BACK - 0.0005)

  // Dials: shutter speed on the left over a drive dial, exposure compensation and shutter release
  // on the right.
  const dialProfile = (radius: number, height: number): [number, number][] => [
    [0, 0],
    [radius - 0.003, 0],
    [radius, 0.003],
    ...ribbed(radius, 0.003, height - 0.003, 18, 0.0025),
    [radius, height - 0.003],
    [radius - 0.003, height],
    [0, height],
  ]
  const dial = (radius: number, height: number, mat: THREE.Material, name: string, x: number, y: number, z: number) => {
    const geometry = track(new THREE.LatheGeometry(dialProfile(radius, height).map(([r, h]) => new THREE.Vector2(r, h)), 40))
    const mesh = new THREE.Mesh(geometry, mat)
    mesh.name = name
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    group.add(mesh)
  }
  dial(0.046, 0.016, darkMetal, 'CAMERA_DriveDial', -0.195, DECK_TOP, 0.012)
  dial(0.034, 0.032, silver, 'CAMERA_ShutterDial', -0.195, DECK_TOP + 0.016, 0.012)
  dial(0.033, 0.03, silver, 'CAMERA_ExposureDial', 0.17, DECK_TOP, 0.004)
  dial(0.015, 0.012, accent, 'CAMERA_ShutterButton', 0.235, DECK_TOP, 0.05)
  dial(0.022, 0.006, darkMetal, 'CAMERA_ShutterCollar', 0.235, DECK_TOP, 0.05)

  // Lens: mount flange, barrel, focus ring and front glass, all on the optical axis.
  const mount = track(turned([[0.074, 0], [0.078, 0.002], [0.078, 0.01], [0.072, 0.012], [0.066, 0.012], [0, 0.012]], 64))
  const mountMesh = new THREE.Mesh(mount, silver)
  mountMesh.name = 'CAMERA_Mount'
  mountMesh.position.set(0, AXIS_Y, FRONT - 0.001)
  group.add(mountMesh)

  const barrelProfile: [number, number][] = [
    [0.054, 0],
    [0.066, 0.003],
    [0.066, 0.02],
    ...ribbed(0.07, 0.02, 0.058, 22, 0.003),
    [0.066, 0.058],
    [0.066, 0.07],
    [0.061, 0.074],
    [0.061, LENS_LENGTH - 0.002],
    [0.056, LENS_LENGTH],
    [0.046, LENS_LENGTH],
    [0.046, LENS_LENGTH - 0.006],
  ]
  const barrel = track(turned(barrelProfile, 56))
  const barrelMesh = new THREE.Mesh(barrel, lensBlack)
  barrelMesh.name = 'CAMERA_Lens'
  barrelMesh.position.set(0, AXIS_Y, FRONT + 0.011)
  barrelMesh.castShadow = true
  group.add(barrelMesh)

  const element = track(new THREE.CircleGeometry(0.046, 48))
  const front = new THREE.Mesh(element, glass)
  front.name = 'CAMERA_LensGlass'
  front.position.set(0, AXIS_Y, FRONT + 0.011 + LENS_LENGTH - 0.0058)
  group.add(front)

  // A thin silver ring around the front of the lens.
  const ring = track(turned([[0.061, 0], [0.063, 0.001], [0.063, 0.006], [0.061, 0.007]], 64))
  const ringMesh = new THREE.Mesh(ring, silver)
  ringMesh.name = 'CAMERA_LensRing'
  ringMesh.position.set(0, AXIS_Y, FRONT + 0.011 + LENS_LENGTH - 0.012)
  group.add(ringMesh)

  // Small front details: a self-timer lamp and a function button.
  const lamp = track(new THREE.CircleGeometry(0.006, 16))
  const lampMesh = new THREE.Mesh(lamp, accent)
  lampMesh.name = 'CAMERA_Lamp'
  lampMesh.position.set(-0.115, 0.17, FRONT + 0.0006)
  group.add(lampMesh)

  group.userData.dispose = () => disposables.forEach((item) => item.dispose())
  return group
}
