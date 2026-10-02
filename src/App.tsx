import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import type { Vector3 } from 'three'
import { IntroPaper } from './components/IntroPaper'
import { MobileDock } from './components/MobileDock'
import { initialWorkbenchState, workbenchReducer } from './interactionState'
import type { LightingMode } from './lighting'
import type { HotspotId } from './types/content'

const ContentPanel = lazy(() => import('./components/ContentPanel').then((module) => ({ default: module.ContentPanel })))
const RoomScene = lazy(() => import('./experience/RoomScene').then((module) => ({ default: module.RoomScene })))

function PanelFallback() {
  return (
    <div className="panel-backdrop panel-loading-backdrop" role="status" aria-live="polite">
      <div className="panel-loading">Opening section…</div>
    </div>
  )
}

function RoomFallback() {
  return (
    <div className="room-loading" role="status" aria-live="polite">
      <span>Preparing the 3D workbench</span>
      <i><b /></i>
    </div>
  )
}

const LIGHTING_KEY = 'peter-workbench-lighting'

function readLighting(): LightingMode {
  try {
    return window.localStorage.getItem(LIGHTING_KEY) === 'night' ? 'night' : 'day'
  } catch {
    return 'day'
  }
}

function LightingToggle({ mode, onToggle }: { mode: LightingMode; onToggle: () => void }) {
  const night = mode === 'night'
  return (
    <button
      type="button"
      className="lighting-toggle"
      onClick={onToggle}
      aria-pressed={night}
      aria-label={night ? 'Switch to day mode' : 'Switch to night mode and turn on the desk lamp'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {night ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
      <span>{night ? 'Night' : 'Day'}</span>
    </button>
  )
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const [entered, setEntered] = useState(false)
  const [{ active, panelHotspot }, dispatch] = useReducer(workbenchReducer, initialWorkbenchState)
  const webglAvailable = useMemo(hasWebGL, [])
  const [lighting, setLighting] = useState<LightingMode>(readLighting)

  const toggleLighting = useCallback(() => {
    setLighting((mode) => (mode === 'day' ? 'night' : 'day'))
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(LIGHTING_KEY, lighting)
    } catch {
      // Storage can be unavailable in private browsing; the toggle still works for this visit.
    }
  }, [lighting])

  const closePanel = useCallback(() => {
    dispatch({ type: 'close' })
  }, [])

  const selectObject = useCallback((id: HotspotId, point: Vector3) => {
    dispatch({ type: 'select-object', id, point })
  }, [])

  const selectFromDock = useCallback((id: HotspotId) => {
    dispatch({ type: 'select-dock', id })
  }, [])

  const openFocusedPanel = useCallback((id: HotspotId) => {
    dispatch({ type: 'focus-complete', id })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (active || panelHotspot)) closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, closePanel, panelHotspot])

  return (
    <main className={`app-shell${entered ? ' is-entered' : ''}`} data-lighting={lighting}>
      <section className="workbench" aria-label="Interactive 3D personal workbench">
        <header className="room-bar">
          <div>
            <strong>Peter Cui</strong>
            <span>Personal Workbench · 2026</span>
          </div>
          <div className="room-bar-actions">
            <p>Drag to orbit · Scroll to zoom · Select an object</p>
            <LightingToggle mode={lighting} onToggle={toggleLighting} />
          </div>
        </header>

        <div className="scene-frame">
          {entered && webglAvailable ? (
            <Suspense fallback={<RoomFallback />}>
              <RoomScene
                entered={entered}
                active={active}
                lighting={lighting}
                onSelect={selectObject}
                onToggleLamp={toggleLighting}
                onFocusComplete={openFocusedPanel}
              />
            </Suspense>
          ) : entered ? (
            <div className="scene-fallback">
              <p>3D mode is unavailable in this browser.</p>
              <span>You can still open every section from the object index below.</span>
            </div>
          ) : (
            <div className="scene-idle" aria-hidden="true">
              <span>ROOM / 01</span>
              <p>Enter to load the 3D room</p>
            </div>
          )}
          <div className="corner-index" aria-hidden="true">
            <span>01</span>
            <i />
            <span>08</span>
          </div>
        </div>

        <footer className="room-footer">
          <span>Research · Product · Photography · Motion</span>
          <span>Blender / React Three Fiber</span>
        </footer>

        {entered && <MobileDock onSelect={selectFromDock} />}
      </section>

      {!entered && <IntroPaper onEntered={() => setEntered(true)} />}

      {panelHotspot && (
        <Suspense fallback={<PanelFallback />}>
          <ContentPanel
            key={panelHotspot}
            hotspot={panelHotspot}
            onClose={closePanel}
          />
        </Suspense>
      )}
    </main>
  )
}
