import { useEffect, useId, useRef, useState } from 'react'
import { BACKGROUND_THEMES, THEME_LIST } from '../themes'
import type { BackgroundThemeId } from '../themes'

export function EnvironmentPicker({ theme, onChange }: {
  theme: BackgroundThemeId
  onChange: (theme: BackgroundThemeId) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const selected = BACKGROUND_THEMES[theme]

  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape, true)
    }
  }, [open])

  return (
    <div className="environment-picker" ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
    }}>
      <button
        className="environment-trigger"
        type="button"
        ref={trigger}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Environment: ${selected.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`environment-swatch swatch-${theme}`} aria-hidden="true" />
        <span>{selected.name}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {open && (
        <div className="environment-menu" id={id}>
          <div className="environment-menu-heading">A change of scenery</div>
          <div className="environment-options" role="radiogroup" aria-label="Environment" onKeyDown={(event) => {
            if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const current = THEME_LIST.findIndex((item) => item.id === theme)
            const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? THEME_LIST.length - 1 : (current + step + THEME_LIST.length) % THEME_LIST.length
            onChange(THEME_LIST[next].id)
            root.current?.querySelector<HTMLButtonElement>(`[data-environment="${THEME_LIST[next].id}"]`)?.focus()
          }}>
            {THEME_LIST.map((item) => (
              <button
                key={item.id}
                type="button"
                className="environment-option"
                role="radio"
                aria-checked={theme === item.id}
                aria-label={item.name}
                title={item.fullName}
                data-environment={item.id}
                tabIndex={theme === item.id ? 0 : -1}
                onClick={() => onChange(item.id)}
              >
                <span className={`environment-preview swatch-${item.id}`}>
                  <img src={item.preview ?? `/images/environments/${item.id}.webp`} alt="" />
                  {theme === item.id && <span className="environment-check" aria-hidden="true">✓</span>}
                </span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
          <p className="environment-menu-note">Your room. Somewhere new.</p>
        </div>
      )}
    </div>
  )
}
