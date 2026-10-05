import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import type { Vector3 } from 'three'
import { IntroPaper } from './components/IntroPaper'
import { initialWorkbenchState, workbenchReducer } from './interactionState'
import type { LightingMode } from './lighting'
import type { BackgroundThemeId } from './themes'
import { resolveTheme, THEME_KEY, environmentIsDark } from './themes'
import { EnvironmentPicker } from './components/EnvironmentPicker'
import type { HotspotId } from './types/content'

const ContentPanel = lazy(() =>
  import('./components/ContentPanel').then((module) => ({ default: module.ContentPanel }))
)
const RoomScene = lazy(() =>
  import('./experience/RoomScene').then((module) => ({ default: module.RoomScene }))
)

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
      <span>Preparing the 3D room</span>
      <i>
        <b />
      </i>
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

function readTheme(): BackgroundThemeId {
  try {
    return resolveTheme(window.localStorage.getItem(THEME_KEY))
  } catch {
    return resolveTheme(null)
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
      aria-label={night ? 'Switch to day ambient' : 'Switch to evening warm light'}
      title={night ? 'Night Mode Active' : 'Day Mode Active'}
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
  const [theme, setTheme] = useState<BackgroundThemeId>(readTheme)

  const toggleLighting = useCallback(() => {
    setLighting((mode) => (mode === 'day' ? 'night' : 'day'))
  }, [])

  const handleThemeChange = useCallback((newTheme: BackgroundThemeId) => {
    setTheme(newTheme)
    try {
      window.localStorage.setItem(THEME_KEY, newTheme)
    } catch {
      // Storage unavailable in private browsing
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(LIGHTING_KEY, lighting)
    } catch {
      // Ignore
    }
  }, [lighting])

  const closePanel = useCallback(() => {
    dispatch({ type: 'close' })
  }, [])

  const selectObject = useCallback((id: HotspotId, point: Vector3) => {
    dispatch({ type: 'select-object', id, point })
  }, [])

  const selectTabDirect = useCallback((id: HotspotId) => {
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
    <main
      className={`app-shell${entered ? ' is-entered' : ''}`}
      data-lighting={lighting}
      data-theme={theme}
      data-environment-dark={environmentIsDark(theme, lighting)}
    >
      <section className="workbench" aria-label="Interactive 3D personal room">
        {/* Top Header Bar */}
        <header className="room-bar">
          {/* Left: Clean Brand */}
          <div className="brand-zone">
            <strong className="brand-title">Peter Cui</strong>
          </div>

          {/* Center: Top Navigation Tabs */}
          <nav className="top-nav-tabs" aria-label="Portfolio Sections">
            <button
              type="button"
              className={`nav-tab-btn ${panelHotspot === 'resume' ? 'is-active' : ''}`}
              onClick={() => selectTabDirect('resume')}
            >
              Resume
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${panelHotspot === 'experience' ? 'is-active' : ''}`}
              onClick={() => selectTabDirect('experience')}
            >
              Intern
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${panelHotspot === 'gallery' ? 'is-active' : ''}`}
              onClick={() => selectTabDirect('gallery')}
            >
              Gallery
            </button>
          </nav>

          {/* Right: Environment Background Switcher & Day/Night Lamp Toggle */}
          <div className="room-bar-right">
            <EnvironmentPicker theme={theme} onChange={handleThemeChange} />

            <LightingToggle mode={lighting} onToggle={toggleLighting} />
          </div>
        </header>

        {/* 3D Room Scene Frame */}
        <div className="scene-frame">
          {entered && webglAvailable ? (
            <Suspense fallback={<RoomFallback />}>
              <RoomScene
                entered={entered}
                active={active}
                lighting={lighting}
                theme={theme}
                onSelect={selectObject}
                onToggleLamp={toggleLighting}
                onFocusComplete={openFocusedPanel}
              />
            </Suspense>
          ) : entered ? (
            <div className="scene-fallback">
              <p>3D mode is unavailable in this browser.</p>
              <span>Explore using the navigation tabs above.</span>
            </div>
          ) : (
            <div className="scene-idle" aria-hidden="true">
              <span>ROOM</span>
              <p>Enter to explore the 3D space</p>
            </div>
          )}
        </div>
      </section>

      {/* Intro Paper overlay */}
      {!entered && <IntroPaper onEntered={() => setEntered(true)} />}

      {/* Content Modals */}
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
