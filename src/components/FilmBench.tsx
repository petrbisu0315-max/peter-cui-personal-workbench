import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { edgeCode, LABEL_STYLES, rollCaption, type Roll } from './filmRolls'
import './FilmBench.css'

const FilmBench3D = lazy(() => import('./FilmBench3D'))

let webglSupport: boolean | null = null
function hasWebGL() {
  if (typeof document === 'undefined') return false
  if (webglSupport === null) {
    try {
      const canvas = document.createElement('canvas')
      webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
    } catch {
      webglSupport = false
    }
  }
  return webglSupport
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const labelVars = (roll: Roll): CSSProperties => {
  const style = LABEL_STYLES[roll.style]
  return { '--paper': style.paper, '--ink': style.ink, '--accent': style.accent, '--cap': style.cap } as CSSProperties
}

/** A canister drawn with CSS: the fallback when WebGL is missing, and the list screen readers get. */
function RollButton({ roll, index, onSelect, onHover }: {
  roll: Roll
  index: number
  onSelect: (id: string) => void
  onHover?: (index: number | null) => void
}) {
  const caption = rollCaption(roll, index)
  return (
    <button
      type="button"
      className="fb-can"
      style={labelVars(roll)}
      onClick={() => onSelect(roll.id)}
      onFocus={() => onHover?.(index)}
      onBlur={() => onHover?.(null)}
      aria-label={`${roll.name}${roll.nameCn ? ` ${roll.nameCn}` : ''}, ${roll.frames.length} photographs`}
    >
      <i className="fb-can-top" />
      <span className="fb-can-label">
        <small>{caption.number}</small>
        <strong>{caption.title}</strong>
        {caption.subtitle && <em>{caption.subtitle}</em>}
        <b>{roll.iso}</b>
        <small>{caption.exposures}</small>
      </span>
      <i className="fb-can-top" />
    </button>
  )
}

function Print({ roll, index, onClose, onStep }: { roll: Roll; index: number; onClose: () => void; onStep: (delta: number) => void }) {
  const frame = roll.frames[index]
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    close.current?.focus()
  }, [])
  return (
    <div className="fb-print" role="dialog" aria-modal="true" aria-label={frame.title} onClick={onClose}>
      <figure onClick={(event) => event.stopPropagation()}>
        <button type="button" ref={close} className="fb-print-close" onClick={onClose} aria-label="Close photograph">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <div className="fb-print-photo">
          <img src={frame.src} alt={frame.alt} decoding="async" />
        </div>
        <figcaption>
          <span>{edgeCode(roll, index)}</span>
          <strong>{frame.title}</strong>
          <span>{[roll.nameCn, frame.place].filter(Boolean).join(' · ')}</span>
          <span>
            {String(index + 1).padStart(2, '0')} / {String(roll.frames.length).padStart(2, '0')}
          </span>
        </figcaption>
        {roll.frames.length > 1 && (
          <>
            <button type="button" className="fb-print-step is-prev" onClick={() => onStep(-1)} aria-label="Previous photograph">
              ‹
            </button>
            <button type="button" className="fb-print-step is-next" onClick={() => onStep(1)} aria-label="Next photograph">
              ›
            </button>
          </>
        )}
      </figure>
    </div>
  )
}

function RollView({ roll, position, onBack, onOpen }: { roll: Roll; position: number; onBack: () => void; onOpen: (index: number) => void }) {
  const [developed, setDeveloped] = useState(prefersReducedMotion)
  const strip = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const caption = rollCaption(roll, position)

  // Frames arrive as negatives and develop straight away, a beat after the strip slides out.
  useEffect(() => {
    back.current?.focus()
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setDeveloped(true)))
    return () => cancelAnimationFrame(frame)
  }, [])

  // A vertical wheel scrolls the strip sideways, the way a roll is pulled through.
  useEffect(() => {
    const element = strip.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || element.scrollWidth <= element.clientWidth) return
      event.preventDefault()
      element.scrollLeft += event.deltaY
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const element = strip.current
    if (!element) return
    if (event.key === 'ArrowRight') element.scrollBy({ left: 300, behavior: 'smooth' })
    if (event.key === 'ArrowLeft') element.scrollBy({ left: -300, behavior: 'smooth' })
  }

  return (
    <section className={`fb-roll${developed ? ' is-developed' : ''}`} style={labelVars(roll)} aria-label={`${roll.name} roll`}>
      <header className="fb-hud">
        <button type="button" className="fb-back" ref={back} onClick={onBack}>
          ← BENCH
        </button>
        <span>
          {caption.number} · {caption.title} {caption.subtitle}
        </span>
        <span>{caption.exposures}</span>
      </header>
      <div className="fb-stage">
        <div className="fb-spool" aria-hidden="true">
          <i />
          <span>
            <small>{caption.number}</small>
            <strong>{caption.title}</strong>
            {caption.subtitle && <em>{caption.subtitle}</em>}
            <b>{roll.iso}</b>
          </span>
          <i />
        </div>
        <div className="fb-strip" ref={strip} tabIndex={0} onKeyDown={onKeyDown} role="group" aria-label={`${roll.name} film strip`}>
          <ol className="fb-film">
            {roll.frames.map((frame, index) => (
              <li key={frame.id} style={{ '--i': Math.min(index, 8) } as CSSProperties}>
                <button type="button" className="fb-frame" onClick={() => onOpen(index)} aria-label={`${frame.title}, frame ${index + 1}`}>
                  <span className="fb-edge">{edgeCode(roll, index)}</span>
                  <span className="fb-image">
                    <img src={frame.thumb} alt={frame.alt} loading="lazy" decoding="async" />
                  </span>
                  <span className="fb-number">{index + 1}A</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="fb-hint">CLICK A FRAME TO PRINT · SCROLL TO FEED THE FILM · ESC TO BACK OUT_</p>
    </section>
  )
}

/**
 * Photographs as rolls of film on a workbench: pick a canister, pull its strip, print a frame.
 * `initialRollId` opens a roll straight away (used by tests).
 */
export function FilmBench({ rolls, title, initialRollId = null }: { rolls: Roll[]; title: string; initialRollId?: string | null }) {
  const [rollId, setRollId] = useState<string | null>(initialRollId)
  const [printIndex, setPrintIndex] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const webgl = useMemo(hasWebGL, [])
  const position = rolls.findIndex((roll) => roll.id === rollId)
  const roll = position >= 0 ? rolls[position] : null
  const total = roll?.frames.length ?? 0

  const step = useCallback((delta: number) => {
    setPrintIndex((current) => (current === null || total === 0 ? current : (current + delta + total) % total))
  }, [total])

  // Escape backs out one level at a time: print, then roll. Only then does the panel close.
  useEffect(() => {
    if (!roll) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (printIndex !== null) setPrintIndex(null)
        else setRollId(null)
      } else if (printIndex !== null && event.key === 'ArrowRight') step(1)
      else if (printIndex !== null && event.key === 'ArrowLeft') step(-1)
      else if (printIndex !== null && event.key === 'Tab') {
        event.preventDefault()
        document.querySelector<HTMLButtonElement>('.fb-print-close')?.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [roll, printIndex, step])

  if (roll) {
    return (
      <div className="fb">
        <RollView key={roll.id} roll={roll} position={position} onBack={() => setRollId(null)} onOpen={setPrintIndex} />
        {printIndex !== null && <Print roll={roll} index={printIndex} onClose={() => setPrintIndex(null)} onStep={step} />}
      </div>
    )
  }

  const hoveredRoll = hovered === null ? null : rolls[hovered]
  const select = (id: string) => {
    setHovered(null)
    setRollId(id)
  }
  const list = (
    <ul className={`fb-rolls${webgl ? ' is-hidden' : ''}`} aria-label={title}>
      {rolls.map((item, index) => (
        <li key={item.id}>
          <RollButton roll={item} index={index} onSelect={select} onHover={webgl ? setHovered : undefined} />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="fb is-bench">
      <span className="fb-mark">/film_</span>
      {webgl ? (
        <>
          <Suspense fallback={<div className="fb-loading">DEVELOPING_</div>}>
            <FilmBench3D rolls={rolls} hoveredIndex={hovered} onHover={setHovered} onSelect={select} />
          </Suspense>
          {list}
        </>
      ) : (
        list
      )}
      <p className="fb-hint">
        {hoveredRoll
          ? `${rollCaption(hoveredRoll, hovered!).number} · ${hoveredRoll.name.toUpperCase()} ${hoveredRoll.nameCn ?? ''} · ${hoveredRoll.frames.length} EXP`
          : webgl
            ? 'DRAG THE BENCH · SELECT A ROLL_'
            : 'SELECT A ROLL_'}
      </p>
    </div>
  )
}
