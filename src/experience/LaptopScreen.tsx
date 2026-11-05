import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import projectsData from '../data/projects.json'
import type { ProjectItem } from '../types/content'
import { lightsOn, type LightingMix } from './AccentLights'
import { LID_TILT, SCREEN_CENTER, SCREEN_HEIGHT, SCREEN_WIDTH } from './laptopModel'
import { drawScreen, SCREEN_FONTS, SCREEN_PX } from './screenArt'
import './LaptopScreen.css'

const projects = projectsData as ProjectItem[]

// The interactive layer is laid out at a fixed resolution and scaled onto the lid. Drei's
// transform mode maps one CSS pixel to 0.025 local units (distanceFactor 10 / 400).
const DOM_SCALE = SCREEN_WIDTH / (SCREEN_PX.width * 0.025)

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

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

export function Desktop({ onClose }: { onClose: () => void }) {
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
        <button type="button" className="ls-close" onClick={onClose} aria-label="Return to the room">
          ×
        </button>
      </div>
      {open ? <ProjectDetail item={open} onBack={() => setOpenId(null)} /> : <ProjectGrid onOpen={setOpenId} />}
    </div>
  )
}

/**
 * The picture on the display, redrawn onto a canvas texture.
 *
 * A texture, not the DOM, is what is on screen from across the room: it is hidden correctly
 * behind objects and from behind the lid, costs one draw call, and is lit all the time without
 * keeping a layer of HTML alive over the canvas. The interactive DOM only replaces it once the
 * camera has come close.
 */
function useScreenTexture() {
  const [source] = useState(() => {
    const canvas = document.createElement('canvas')
    canvas.width = SCREEN_PX.width
    canvas.height = SCREEN_PX.height
    const texture = new THREE.CanvasTexture(canvas)
    texture.name = 'Laptop display'
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return { canvas, texture, images: projects.map(() => null as HTMLImageElement | null) }
  })

  useEffect(() => {
    const context = source.canvas.getContext('2d')
    if (!context) return
    let alive = true
    const paint = () => {
      if (!alive) return
      drawScreen(context, projects, source.images, new Date())
      source.texture.needsUpdate = true
    }
    paint()
    projects.forEach((item, index) => {
      if (!item.image) return
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => {
        source.images[index] = image
        paint()
      }
      image.src = item.image
    })
    // Web fonts load on demand; ask for them explicitly, then draw again with the real faces.
    if (document.fonts) void Promise.allSettled(SCREEN_FONTS.map((font) => document.fonts.load(font))).then(paint)
    const clock = window.setInterval(paint, 20_000)
    return () => {
      alive = false
      window.clearInterval(clock)
    }
  }, [source])

  useEffect(() => () => source.texture.dispose(), [source])
  return source.texture
}

/** A cool wash from the display onto the keyboard, which only matters once the room is dark. */
function ScreenGlow({ mix }: { mix: LightingMix }) {
  const light = useRef<THREE.PointLight>(null!)
  useFrame(() => {
    light.current.intensity = 0.04 + 0.34 * lightsOn(mix.current.value)
  })
  return <pointLight ref={light} position={[0, -0.12, 0.3]} color="#a9c3ff" distance={1.8} decay={2} intensity={0.04} />
}

/**
 * The laptop's display. It is always lit and shows the projects; focusing the laptop layers the
 * interactive version over the same picture.
 */
export function LaptopScreen({ on, onClose, mix }: { on: boolean; onClose: () => void; mix: LightingMix }) {
  const texture = useScreenTexture()
  return (
    <group position={SCREEN_CENTER} rotation={[LID_TILT, 0, 0]}>
      <mesh name="LAPTOP_Display">
        <planeGeometry args={[SCREEN_WIDTH, SCREEN_HEIGHT]} />
        <meshBasicMaterial map={texture} toneMapped={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
      </mesh>
      <ScreenGlow mix={mix} />
      {on && (
        <Html transform scale={DOM_SCALE} zIndexRange={[7, 0]}>
          {/* Html portals into the element the canvas listens on, so pointer events must stop here
              or a click on the screen would also be raycast into the room behind it. */}
          <div
            className="laptop-screen"
            style={{ width: SCREEN_PX.width, height: SCREEN_PX.height }}
            onPointerDown={stop}
            onPointerUp={stop}
            onPointerMove={stop}
            onClick={stop}
            onWheel={stop}
          >
            <Desktop onClose={onClose} />
          </div>
        </Html>
      )}
    </group>
  )
}
