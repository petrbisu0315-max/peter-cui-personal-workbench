import type { Vector3 } from 'three'
import type { HotspotId } from './types/content'

export type ActiveHotspot = {
  id: HotspotId
  point: Vector3 | null
}

export type WorkbenchState = {
  active: ActiveHotspot | null
  panelHotspot: HotspotId | null
}

export type WorkbenchAction =
  | { type: 'select-object'; id: HotspotId; point: Vector3 }
  | { type: 'select-dock'; id: HotspotId }
  | { type: 'focus-complete'; id: HotspotId }
  | { type: 'close' }

export const initialWorkbenchState: WorkbenchState = {
  active: null,
  panelHotspot: null,
}

export function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case 'select-object':
      return {
        active: { id: action.id, point: action.point },
        panelHotspot: null,
      }
    case 'select-dock':
      return {
        active: { id: action.id, point: null },
        panelHotspot: action.id,
      }
    case 'focus-complete':
      if (state.active?.id !== action.id || !state.active.point) return state
      return { ...state, panelHotspot: action.id }
    case 'close':
      return initialWorkbenchState
  }
}
