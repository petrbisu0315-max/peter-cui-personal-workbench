import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import projectsData from '../data/projects.json'
import type { ProjectItem } from '../types/content'
import { useReducedMotion } from '../useReducedMotion'
import './LaptopScreen.css'

const projects = projectsData as ProjectItem[]

// Display area of the lid of PROP_Laptop_GLB, in the laptop mesh's own frame. The lid's front
// faces lie on one plane (normal 0, 0.294, 0.956), so the screen is that plane tilted back about X,
// inset from the measured lid outline to leave the bezel visible. Lifted slightly to avoid z-fighting.
const LID_TILT = -Math.asin(0.294)
const LID_NORMAL = new THREE.Vector3(0, Math.sin(-LID_TILT), Math.cos(LID_TILT))
const LID_UP = new THREE.Vector3(0, Math.cos(LID_TILT), Math.sin(LID_TILT))
const LID_OFFSET = -0.1196 + 0.006
const SCREEN_CENTER_X = -0.009
const SCREEN_CENTER_UP = 0.515
export const SCREEN_WIDTH = 1.06
export const SCREEN_HEIGHT = 0.68

export const SCREEN_CENTER = new THREE.Vector3(SCREEN_CENTER_X, 0, 0)
  .addScaledVector(LID_UP, SCREEN_CENTER_UP)
  .addScaledVector(LID_NORMAL, LID_OFFSET)
export const SCREEN_NORMAL = LID_NORMAL.clone()

// The DOM is laid out at a fixed resolution and scaled onto the lid. Drei's transform mode maps
// one CSS pixel to 0.025 local units (distanceFactor 10 / 400).
const DOM_WIDTH = 1280
const DOM_HEIGHT = Math.round((DOM_WIDTH * SCREEN_HEIGHT) / SCREEN_WIDTH)
const DOM_SCALE = SCREEN_WIDTH / (DOM_WIDTH * 0.025)

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

const BOOT_MS = 1600
const SHUTDOWN_MS = 450

type Phase = 'hidden' | 'boot' | 'desktop' | 'shutdown'

function usePowerPhase(on: boolean, reduced: boolean): Phase {
  const [phase, setPhase] = useState<Phase>('hidden')
  useEffect(() => {
    if (on) {
      if (reduced) {
        setPhase('desktop')
        return
      }
      setPhase('boot')
      const timer = window.setTimeout(() => setPhase('desktop'), BOOT_MS)
      return () => window.clearTimeout(timer)
    }
    setPhase((current) => (current === 'hidden' || reduced ? 'hidden' : 'shutdown'))
    const timer = window.setTimeout(() => setPhase('hidden'), reduced ? 0 : SHUTDOWN_MS)
    return () => window.clearTimeout(timer)
  }, [on, reduced])
  return phase
}

function BootScreen() {
  return (
    <div className="ls-boot">
      <span className="ls-boot-mark">P</span>
      <span className="ls-boot-name">Peter Cui · Vibe Coding</span>
      <i className="ls-boot-bar"><b /></i>
    </div>
  )
}

function ProjectGrid({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="ls-home">
      <header className="ls-home-head">
        <p className="ls-eyebrow">Vibe coding · {projects.length} live sites</p>
        <h1>Things I built by talking to AI</h1>
        <p>Each one started as a conversation and shipped as a real website. Pick one to look closer.</p>
      </header>
      <ul className="ls-grid">
        {projects.map((item, index) => (
          <li key={item.id}>
            <button type="button" className="ls-card" onClick={() => onOpen(item.id)}>
              <span className="ls-thumb">
                {item.image && <img src={item.image} alt="" loading="lazy" />}
              </span>
              <span className="ls-card-meta">{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.title}</strong>
              <span className="ls-card-line">{item.tagline}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProjectDetail({ item, onBack }: { item: ProjectItem; onBack: () => void }) {
  return (
    <article className="ls-detail">
      <button type="button" className="ls-back" onClick={onBack}>← All projects</button>
      <div className="ls-detail-body">
        <a className="ls-detail-shot" href={item.url} target="_blank" rel="noreferrer">
          {item.image && <img src={item.image} alt={`${item.title} screenshot`} />}
        </a>
        <div className="ls-detail-text">
          <p className="ls-eyebrow">{item.status === 'in-progress' ? 'In progress' : 'Live'}{item.period ? ` · ${item.period}` : ''}</p>
          <h2>{item.title}</h2>
          <p className="ls-detail-tagline">{item.tagline}</p>
          <p>{item.description}</p>
          <div className="ls-tags">
            {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          {item.url && (
            <a className="ls-open" href={item.url} target="_blank" rel="noreferrer">Open the site ↗</a>
          )}
        </div>
      </div>
    </article>
  )
}

function Desktop({ onClose }: { onClose: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = projects.find((item) => item.id === openId) ?? null
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="ls-desktop">
      <div className="ls-menubar">
        <span className="ls-menubar-brand">● Peter OS</span>
        <span>Projects</span>
        <span className="ls-menubar-spacer" />
        <span>{time}</span>
        <button type="button" className="ls-close" onClick={onClose} aria-label="Turn off the screen and return to the room">
          ✕
        </button>
      </div>
      {open ? <ProjectDetail item={open} onBack={() => setOpenId(null)} /> : <ProjectGrid onOpen={setOpenId} />}
    </div>
  )
}

/** The laptop's display: dark until the camera arrives, then it powers on and lists the projects. */
export function LaptopScreen({ on, onClose }: { on: boolean; onClose: () => void }) {
  const reduced = useReducedMotion()
  const phase = usePowerPhase(on, reduced)
  if (phase === 'hidden') return null
  return (
    <group position={SCREEN_CENTER} rotation={[LID_TILT, 0, 0]}>
      <Html transform scale={DOM_SCALE} zIndexRange={[7, 0]}>
        {/* Html portals into the element the canvas listens on, so pointer events must stop here
            or a click on the screen would also be raycast into the room behind it. */}
        <div
          className={`laptop-screen is-${phase}`}
          style={{ width: DOM_WIDTH, height: DOM_HEIGHT }}
          onPointerDown={stop}
          onPointerUp={stop}
          onPointerMove={stop}
          onClick={stop}
          onWheel={stop}
        >
          <div className="ls-crt">
            {phase === 'boot' ? <BootScreen /> : <Desktop onClose={onClose} />}
          </div>
        </div>
      </Html>
    </group>
  )
}
