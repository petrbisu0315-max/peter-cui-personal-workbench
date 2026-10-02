import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { initialWorkbenchState, workbenchReducer } from './interactionState'

describe('workbench interaction state', () => {
  it('focuses a 3D object before opening its panel', () => {
    const focused = workbenchReducer(initialWorkbenchState, {
      type: 'select-object',
      id: 'projects',
      point: new Vector3(1, 2, 3),
    })

    expect(focused.active?.id).toBe('projects')
    expect(focused.panelHotspot).toBeNull()

    const opened = workbenchReducer(focused, { type: 'focus-complete', id: 'projects' })
    expect(opened.panelHotspot).toBe('projects')
  })

  it('opens dock selections immediately without waiting for camera focus', () => {
    const selected = workbenchReducer(initialWorkbenchState, { type: 'select-dock', id: 'resume' })

    expect(selected.active).toEqual({ id: 'resume', point: null })
    expect(selected.panelHotspot).toBe('resume')
  })

  it('ignores a stale camera completion after the selection changes', () => {
    const first = workbenchReducer(initialWorkbenchState, {
      type: 'select-object',
      id: 'projects',
      point: new Vector3(1, 0, 0),
    })
    const second = workbenchReducer(first, {
      type: 'select-object',
      id: 'photos',
      point: new Vector3(2, 0, 0),
    })

    expect(workbenchReducer(second, { type: 'focus-complete', id: 'projects' })).toBe(second)
  })

  it('clears focus and panel state together', () => {
    const selected = workbenchReducer(initialWorkbenchState, { type: 'select-dock', id: 'movies' })
    expect(workbenchReducer(selected, { type: 'close' })).toEqual(initialWorkbenchState)
  })
})
