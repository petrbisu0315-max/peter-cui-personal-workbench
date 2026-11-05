import * as THREE from 'three'

/** What the camera looks at in the overview: the desk wall, right of the room centre, so the furniture is balanced in the frame. */
export const OVERVIEW_TARGET = new THREE.Vector3(0.65, -0.42, 0)

/** How far the camera looks down on the room, in degrees. */
export const OVERVIEW_PITCH_DEG = 6.4

/** The view must hold this much of the room's width, with a margin either side. */
const CONTENT_WIDTH = 6.0
const FILL = 0.8
const FOV_DEG = 38
export const MIN_OVERVIEW_DISTANCE = 5.9
export const MAX_OVERVIEW_DISTANCE = 10.5

/**
 * The default view. It is square-on: the camera sits directly in front of its target, so the
 * back wall faces the viewer with no sideways turn. Distance follows the window's aspect ratio,
 * close on a wide screen and further back on a narrow one so the whole room still fits.
 */
export function overviewFor(aspect: number) {
  const halfWidth = Math.tan(THREE.MathUtils.degToRad(FOV_DEG / 2))
  const fit = CONTENT_WIDTH / (FILL * 2 * halfWidth * Math.max(aspect, 0.1))
  const distance = THREE.MathUtils.clamp(fit, MIN_OVERVIEW_DISTANCE, MAX_OVERVIEW_DISTANCE)
  const pitch = THREE.MathUtils.degToRad(OVERVIEW_PITCH_DEG)
  return {
    target: OVERVIEW_TARGET.clone(),
    position: new THREE.Vector3(
      OVERVIEW_TARGET.x,
      OVERVIEW_TARGET.y + distance * Math.sin(pitch),
      OVERVIEW_TARGET.z + distance * Math.cos(pitch),
    ),
    distance,
  }
}
