import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import type { Vector3 } from 'three'
import { IntroPaper } from './components/IntroPaper'
import { MobileDock } from './components/MobileDock'
import { initialWorkbenchState, workbenchReducer } from './interactionState'
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
    <main className={`app-shell${entered ? ' is-entered' : ''}`}>
      <section className="workbench" aria-label="Interactive 3D personal workbench">
        <header className="room-bar">
          <div>
            <strong>Peter Cui</strong>
            <span>Personal Workbench · 2026</span>
          </div>
          <p>Drag to orbit · Scroll to zoom · Select an object</p>
        </header>

        <div className="scene-frame">
          {entered && webglAvailable ? (
            <Suspense fallback={<RoomFallback />}>
              <RoomScene
                entered={entered}
                active={active}
                onSelect={selectObject}
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
