import { describe, expect, it } from 'vitest'
import { hotspotFromObjectName, hotspotOrder } from './hotspots'

describe('hotspot mapping', () => {
  it('keeps the visible navigation order stable', () => {
    expect(hotspotOrder).toEqual([
      'resume',
      'experience',
      'research',
      'projects',
      'photos',
      'books',
      'movies',
      'whiteboard',
    ])
  })

  it.each([
    ['SLOT_Resume_Paper', 'resume'],
    ['SLOT_IDBadge', 'experience'],
    ['PROP_Document_Research', 'research'],
    ['PROP_Laptop', 'projects'],
    ['PROP_Camera_Body', 'photos'],
    ['PROP_Bookcase', 'books'],
    ['SLOT_InterstellarPoster', 'movies'],
    ['PROP_Canvas', 'whiteboard'],
  ] as const)('maps %s to %s', (objectName, hotspot) => {
    expect(hotspotFromObjectName(objectName)).toBe(hotspot)
  })

  it('ignores unrelated meshes', () => {
    expect(hotspotFromObjectName('Desk_Leg_01')).toBeNull()
    // The résumé paper sits inside SLOT_Resume, so the parent supplies the hotspot.
    expect(hotspotFromObjectName('Resume_PaperThumbnail')).toBeNull()
  })
})
