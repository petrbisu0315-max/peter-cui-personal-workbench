import { describe, expect, it } from 'vitest'
import { MAX_OVERVIEW_DISTANCE, MIN_OVERVIEW_DISTANCE, OVERVIEW_PITCH_DEG, overviewFor } from './overviewCamera'

describe('overview camera', () => {
  it('is square-on to the back wall at every aspect ratio', () => {
    for (const aspect of [0.45, 0.8, 1, 1.4, 1.78, 2.4]) {
      const { position, target } = overviewFor(aspect)
      expect(position.x, `aspect ${aspect}`).toBe(target.x)
      expect(position.z).toBeGreaterThan(target.z)
    }
  })

  it('looks down at the same shallow angle whatever the distance', () => {
    for (const aspect of [0.6, 1.2, 2]) {
      const { position, target } = overviewFor(aspect)
      const pitch = (Math.atan2(position.y - target.y, position.z - target.z) * 180) / Math.PI
      expect(pitch).toBeCloseTo(OVERVIEW_PITCH_DEG, 6)
    }
  })

  it('sits closer than the old default on a wide screen', () => {
    const OLD_DISTANCE = 8.5
    expect(overviewFor(1.83).distance).toBeLessThan(OLD_DISTANCE * 0.75)
    expect(overviewFor(1.83).distance).toBeGreaterThanOrEqual(MIN_OVERVIEW_DISTANCE)
  })

  it('backs away on narrower windows so the room still fits, within the orbit limit', () => {
    expect(overviewFor(1).distance).toBeGreaterThan(overviewFor(1.83).distance)
    expect(overviewFor(0.3).distance).toBe(MAX_OVERVIEW_DISTANCE)
    expect(MAX_OVERVIEW_DISTANCE).toBeLessThanOrEqual(11)
  })
})
