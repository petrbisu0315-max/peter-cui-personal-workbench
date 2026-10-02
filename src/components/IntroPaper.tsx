import { useCallback, useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

type Props = { onEntered: () => void }

export function IntroPaper({ onEntered }: Props) {
  const layerRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLElement>(null)
  const startX = useRef(0)
  const deltaX = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useGSAP(() => {
    gsap.fromTo(
      paperRef.current,
      { y: 24, rotate: -1.2, opacity: 0 },
      { y: 0, rotate: -1.2, opacity: 1, duration: reduceMotion ? 0.01 : 0.9, ease: 'power3.out' },
    )
  }, { scope: layerRef })

  const enter = useCallback((skipAnimation = false) => {
    if (hasEntered) return
    setHasEntered(true)
    const paper = paperRef.current
    const layer = layerRef.current
    if (!paper || !layer) return
    const timeline = gsap.timeline({
      defaults: { overwrite: true },
      onComplete: () => {
        onEntered()
        layer.setAttribute('aria-hidden', 'true')
      },
    })
    if (reduceMotion || skipAnimation) {
      timeline.to(layer, { opacity: 0, duration: skipAnimation ? 0.12 : 0.18, pointerEvents: 'none' })
    } else {
      timeline
        .to(paper, { xPercent: -135, rotate: -13, duration: 0.78, ease: 'power3.inOut' })
        .to(layer, { opacity: 0, duration: 0.32, pointerEvents: 'none' }, '-=0.28')
    }
  }, [hasEntered, onEntered, reduceMotion])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && !hasEntered) {
        event.preventDefault()
        enter(false)
      }
      if (event.key === 'Escape' && !hasEntered) {
        event.preventDefault()
        enter(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enter, hasEntered])

  return (
    <div className="intro-layer" ref={layerRef}>
      <div className="intro-grain" aria-hidden="true" />
      <article
        className={`intro-paper${dragging ? ' is-dragging' : ''}`}
        ref={paperRef}
        tabIndex={0}
        aria-label="Introduction. Drag left or press Enter to open the workbench."
        onPointerDown={(event) => {
          if (hasEntered) return
          setDragging(true)
          startX.current = event.clientX
          deltaX.current = 0
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!dragging || hasEntered || !paperRef.current) return
          deltaX.current = Math.min(0, event.clientX - startX.current)
          gsap.set(paperRef.current, {
            x: Math.max(deltaX.current, -220),
            rotate: -1.2 + deltaX.current * 0.022,
          })
        }}
        onPointerUp={() => {
          if (!dragging) return
          setDragging(false)
          if (deltaX.current < -105) enter(false)
          else gsap.to(paperRef.current, { x: 0, rotate: -1.2, duration: 0.45, ease: 'power3.out' })
        }}
        onPointerCancel={() => {
          setDragging(false)
          gsap.to(paperRef.current, { x: 0, rotate: -1.2, duration: 0.35 })
        }}
      >
        <div className="paper-register top-left" aria-hidden="true" />
        <div className="paper-register bottom-right" aria-hidden="true" />
        <p className="paper-kicker">Personal Workbench / 01</p>
        <p className="paper-name">Hi, I'm Peter Cui.</p>
        <h1>Insightful Navigator<br />of Turbulent Journeys</h1>
        <p className="paper-description">Researching people, building AI products, and collecting the things that help me move forward.</p>
        <div className="paper-rule" />
        <div className="paper-topics" aria-label="Areas of work">
          <span>Research</span><span>PO Internships</span><span>Vibecoding</span>
        </div>
        <div className="intro-actions" onPointerDown={(event) => event.stopPropagation()}>
          <button className="enter-control" onClick={() => enter(false)} type="button">
            Enter workbench <i aria-hidden="true" />
          </button>
          <button className="skip-control" onClick={() => enter(true)} type="button">Skip intro</button>
        </div>
      </article>
      <p className="intro-hint">Drag the paper left · press Enter to enter · press Esc to skip</p>
    </div>
  )
}
