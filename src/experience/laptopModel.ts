import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * The desk laptop, built from rounded primitives instead of a scanned mesh.
 *
 * The GLB laptop was a 500,000-triangle scan. Cutting it down for load time left the flat
 * lid with lumpy edges (up to 1% of the laptop's width), because a flat, straight-edged
 * object has no triangles to spare. Rounded boxes give exact straight edges and true
 * rounded corners at a few thousand triangles, so the shape is smooth by construction.
 *
 * Frame: origin at the centre of the base underneath, +Y up, +Z toward the person sitting at
 * the desk (the front edge), +X to their right. Units match the room model.
 */

// --- Base --------------------------------------------------------------------------------
export const BASE_WIDTH = 1.15
export const BASE_DEPTH = 0.8
export const BASE_THICKNESS = 0.046
/** Front edge of the base. The back edge sits BASE_DEPTH behind it. */
export const BASE_FRONT_Z = 0.68
export const BASE_CENTER_Z = BASE_FRONT_Z - BASE_DEPTH / 2

// --- Lid ---------------------------------------------------------------------------------
export const LID_WIDTH = BASE_WIDTH
export const LID_HEIGHT = 0.8
export const LID_THICKNESS = 0.026
/** The lid leans back by this much from vertical; the front-face normal is (0, 0.294, 0.956). */
export const LID_TILT = -Math.asin(0.294)
export const HINGE = new THREE.Vector3(0, BASE_THICKNESS + 0.004, BASE_FRONT_Z - BASE_DEPTH + 0.02)

// --- Display -----------------------------------------------------------------------------
export const SCREEN_WIDTH = 1.06
export const SCREEN_HEIGHT = 0.68
/** Space between the bottom of the lid and the bottom of the display (the chin). */
export const SCREEN_CHIN = 0.066
/** How far the glass and the display stand proud of the lid body's front face. */
const GLASS_LIFT = 0.0004
const SCREEN_LIFT = 0.0014

const lidRotation = new THREE.Euler(LID_TILT, 0, 0)

/** Centre of the display in the laptop frame, resting on the glass. */
export const SCREEN_CENTER = new THREE.Vector3(0, SCREEN_CHIN + SCREEN_HEIGHT / 2, LID_THICKNESS / 2 + SCREEN_LIFT)
  .applyEuler(lidRotation)
  .add(HINGE)

/** Direction the display faces. */
export const SCREEN_NORMAL = new THREE.Vector3(0, 0, 1).applyEuler(lidRotation)

// --- Keyboard ----------------------------------------------------------------------------
export const KEY_PITCH = 0.064
export const KEY_GAP = 0.008
export const KEYBOARD_UNITS = 15
export const KEYBOARD_WIDTH = KEYBOARD_UNITS * KEY_PITCH
/** Distance from the back of the base to the top of the keyboard. */
const KEYBOARD_BACK_MARGIN = 0.1

type KeyRow = { depth: number; pitch: number; keys: number[] }

/** Hotspots resolve by object name, so the modelled laptop keeps the scanned one's. */
export const LAPTOP_NODE_NAME = 'PROP_Laptop_GLB'

const ones = (count: number) => Array.from({ length: count }, () => 1)

/** Key widths in units of one key, laid out as on a standard laptop keyboard. */
export const KEY_ROWS: KeyRow[] = [
  { depth: 0.036, pitch: 0.044, keys: ones(15) },
  { depth: 0.056, pitch: KEY_PITCH, keys: [...ones(13), 2] },
  { depth: 0.056, pitch: KEY_PITCH, keys: [1.5, ...ones(12), 1.5] },
  { depth: 0.056, pitch: KEY_PITCH, keys: [1.75, ...ones(11), 2.25] },
  { depth: 0.056, pitch: KEY_PITCH, keys: [2.25, ...ones(10), 2.75] },
  { depth: 0.056, pitch: KEY_PITCH, keys: [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1] },
]

export type KeyPlacement = { x: number; z: number; width: number; depth: number }

/** Every key's centre and size on the deck, in the laptop frame. */
export function layoutKeys(): KeyPlacement[] {
  const keys: KeyPlacement[] = []
  let cursor = BASE_FRONT_Z - BASE_DEPTH + KEYBOARD_BACK_MARGIN
  for (const row of KEY_ROWS) {
    const z = cursor + row.pitch / 2
    let units = 0
    for (const span of row.keys) {
      keys.push({
        x: -KEYBOARD_WIDTH / 2 + (units + span / 2) * KEY_PITCH,
        z,
        width: span * KEY_PITCH - KEY_GAP,
        depth: row.depth,
      })
      units += span
    }
    cursor += row.pitch
  }
  return keys
}

/** Back-to-front extent of the key area. */
export function keyboardDepth() {
  return KEY_ROWS.reduce((sum, row) => sum + row.pitch, 0)
}

export const TRACKPAD = { width: 0.4, depth: 0.26, gapBelowKeys: 0.04 }

const KEY_HEIGHT = 0.012
const KEY_EMBED = 0.001

function material(options: THREE.MeshStandardMaterialParameters, name: string) {
  const result = new THREE.MeshStandardMaterial(options)
  result.name = name
  return result
}

function noRaycast() {
  // Small details never need to be the thing under the pointer; the body already is.
}

export function createLaptopModel() {
  const group = new THREE.Group()
  group.name = LAPTOP_NODE_NAME
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item)
    return item
  }

  const aluminium = track(material({ color: 0x34353b, metalness: 0.6, roughness: 0.42 }, 'Laptop aluminium'))
  const deckDark = track(material({ color: 0x0b0c0e, metalness: 0.2, roughness: 0.7 }, 'Laptop key well'))
  const keyMaterial = track(material({ color: 0x15161a, metalness: 0.1, roughness: 0.5 }, 'Laptop keys'))
  const trackpadMaterial = track(material({ color: 0x2c2d33, metalness: 0.55, roughness: 0.3 }, 'Laptop trackpad'))
  const hingeMaterial = track(material({ color: 0x1c1d21, metalness: 0.7, roughness: 0.4 }, 'Laptop hinge'))
  const glass = track(
    new THREE.MeshPhysicalMaterial({ color: 0x040405, metalness: 0, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 }),
  )
  glass.name = 'Laptop glass'

  // Base. Eight segments per corner keeps the curve smooth even in profile.
  const baseGeometry = track(new RoundedBoxGeometry(BASE_WIDTH, BASE_THICKNESS, BASE_DEPTH, 8, 0.018))
  const base = new THREE.Mesh(baseGeometry, aluminium)
  base.name = 'LAPTOP_Base'
  base.position.set(0, BASE_THICKNESS / 2, BASE_CENTER_Z)
  base.castShadow = true
  base.receiveShadow = true
  group.add(base)

  // Key well, speaker strips and trackpad lie on the deck.
  const keysDepth = keyboardDepth()
  const keysCenterZ = BASE_FRONT_Z - BASE_DEPTH + KEYBOARD_BACK_MARGIN + keysDepth / 2
  const wellGeometry = track(new RoundedBoxGeometry(KEYBOARD_WIDTH + 0.02, 0.004, keysDepth + 0.02, 3, 0.0016))
  const well = new THREE.Mesh(wellGeometry, deckDark)
  well.name = 'LAPTOP_KeyWell'
  well.position.set(0, BASE_THICKNESS + 0.0004, keysCenterZ)
  well.raycast = noRaycast
  group.add(well)

  const speakerGeometry = track(new RoundedBoxGeometry(0.03, 0.0035, keysDepth, 3, 0.0014))
  for (const side of [-1, 1]) {
    const speaker = new THREE.Mesh(speakerGeometry, deckDark)
    speaker.name = 'LAPTOP_Speaker'
    speaker.position.set(side * (KEYBOARD_WIDTH / 2 + 0.047), BASE_THICKNESS + 0.0002, keysCenterZ)
    speaker.raycast = noRaycast
    group.add(speaker)
  }

  const trackpadZ = BASE_FRONT_Z - BASE_DEPTH + KEYBOARD_BACK_MARGIN + keysDepth + TRACKPAD.gapBelowKeys + TRACKPAD.depth / 2
  const trackpadGeometry = track(new RoundedBoxGeometry(TRACKPAD.width, 0.0034, TRACKPAD.depth, 4, 0.0016))
  const trackpad = new THREE.Mesh(trackpadGeometry, trackpadMaterial)
  trackpad.name = 'LAPTOP_Trackpad'
  trackpad.position.set(0, BASE_THICKNESS + 0.0003, trackpadZ)
  trackpad.raycast = noRaycast
  group.add(trackpad)

  // One instanced mesh per distinct key size, so the keys stay a handful of draw calls.
  const placements = layoutKeys()
  const bySize = new Map<string, KeyPlacement[]>()
  for (const key of placements) {
    const id = `${key.width.toFixed(4)}x${key.depth.toFixed(4)}`
    bySize.set(id, [...(bySize.get(id) ?? []), key])
  }
  const matrix = new THREE.Matrix4()
  for (const [id, keys] of bySize) {
    const geometry = track(new RoundedBoxGeometry(keys[0].width, KEY_HEIGHT, keys[0].depth, 2, 0.0035))
    const instanced = new THREE.InstancedMesh(geometry, keyMaterial, keys.length)
    instanced.name = `LAPTOP_Keys_${id}`
    keys.forEach((key, index) => {
      matrix.makeTranslation(key.x, BASE_THICKNESS + KEY_HEIGHT / 2 - KEY_EMBED, key.z)
      instanced.setMatrixAt(index, matrix)
    })
    instanced.instanceMatrix.needsUpdate = true
    instanced.raycast = noRaycast
    group.add(instanced)
  }

  // Hinge barrel along the back of the base.
  const hingeGeometry = track(new THREE.CylinderGeometry(0.0165, 0.0165, BASE_WIDTH - 0.28, 24))
  const hinge = new THREE.Mesh(hingeGeometry, hingeMaterial)
  hinge.name = 'LAPTOP_Hinge'
  hinge.rotation.z = Math.PI / 2
  hinge.position.copy(HINGE)
  hinge.raycast = noRaycast
  group.add(hinge)

  // Lid, pivoting at the hinge. Its local frame has +Y up the lid and +Z out of the front face.
  const lid = new THREE.Group()
  lid.name = 'LAPTOP_LidPivot'
  lid.position.copy(HINGE)
  lid.rotation.copy(lidRotation)
  group.add(lid)

  const lidGeometry = track(new RoundedBoxGeometry(LID_WIDTH, LID_HEIGHT, LID_THICKNESS, 8, 0.012))
  const lidBody = new THREE.Mesh(lidGeometry, aluminium)
  lidBody.name = 'LAPTOP_Lid'
  lidBody.position.set(0, LID_HEIGHT / 2, 0)
  lidBody.castShadow = true
  lidBody.receiveShadow = true
  lid.add(lidBody)

  // Black glass covering the front, inset so a thin aluminium rim shows around it.
  const RIM = 0.0105
  const glassShape = roundedRectShape(LID_WIDTH - RIM * 2, LID_HEIGHT - RIM * 2, 0.012)
  const glassGeometry = track(new THREE.ShapeGeometry(glassShape, 10))
  const glassPane = new THREE.Mesh(glassGeometry, glass)
  glassPane.name = 'LAPTOP_Glass'
  glassPane.position.set(0, LID_HEIGHT / 2, LID_THICKNESS / 2 + GLASS_LIFT)
  lid.add(glassPane)

  // Camera lens in the top bezel.
  const lensGeometry = track(new THREE.CircleGeometry(0.0052, 20))
  const lens = new THREE.Mesh(lensGeometry, track(material({ color: 0x1a1c22, metalness: 0.3, roughness: 0.25 }, 'Laptop camera')))
  lens.name = 'LAPTOP_Camera'
  lens.position.set(0, LID_HEIGHT - 0.027, LID_THICKNESS / 2 + GLASS_LIFT + 0.0003)
  lens.raycast = noRaycast
  lid.add(lens)

  group.userData.dispose = () => disposables.forEach((item) => item.dispose())
  return group
}

function roundedRectShape(width: number, height: number, radius: number) {
  const x = -width / 2
  const y = -height / 2
  const shape = new THREE.Shape()
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0, false)
  shape.lineTo(x + width, y + height - radius)
  shape.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2, false)
  shape.lineTo(x + radius, y + height)
  shape.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI, false)
  shape.lineTo(x, y + radius)
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false)
  return shape
}
