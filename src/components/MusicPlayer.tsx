import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import music from '../data/music.json'
import { formatTime, initialMusicState, MusicController, parseVolume, VOLUME_KEY } from '../audio/musicController'
import type { Track } from '../audio/musicController'
import './MusicPlayer.css'

const tracks: Track[] = music

type IconName = 'play' | 'pause' | 'previous' | 'next' | 'list' | 'volume' | 'mute'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    play: 'M9 5.5 19 12 9 18.5Z',
    pause: 'M8 6v12M16 6v12',
    previous: 'M6 6v12M18 6 9 12l9 6Z',
    next: 'M18 6v12M6 6l9 6-9 6Z',
    list: 'M5 6h14M5 12h14M5 18h9',
    volume: 'M11 5 6 9H3v6h3l5 4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14',
    mute: 'M11 5 6 9H3v6h3l5 4ZM16 9l5 6M21 9l-5 6',
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function MusicPlayer({ obscured = false }: { obscured?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const controller = useRef<MusicController | null>(null)
  const [state, setState] = useState(() => initialMusicState(tracks))
  const [expanded, setExpanded] = useState(false)
  const container = useRef<HTMLElement>(null)
  const queueButton = useRef<HTMLButtonElement>(null)
  const playlistId = useId()
  const track = tracks[state.index]
  const running = state.status === 'playing'
  const canPause = running || state.status === 'loading'
  const silent = state.muted || state.volume === 0

  useEffect(() => {
    if (!audioRef.current) return
    let volume = parseVolume(null)
    try { volume = parseVolume(localStorage.getItem(VOLUME_KEY)) } catch { /* Volume still works without storage. */ }
    const player = new MusicController(audioRef.current, tracks, setState, volume)
    controller.current = player
    return () => { player.dispose(); controller.current = null }
  }, [])

  useEffect(() => {
    if (!expanded) return
    container.current?.querySelector<HTMLButtonElement>('.music-queue [aria-current="true"]')?.focus()
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setExpanded(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setExpanded(false)
      queueButton.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape, true)
    }
  }, [expanded])

  useEffect(() => {
    if (obscured) setExpanded(false)
  }, [obscured])

  const volumeChanged = (value: number) => {
    controller.current?.setVolume(value)
    try { localStorage.setItem(VOLUME_KEY, String(value)) } catch { /* Optional preference. */ }
  }

  return (
    <aside
      className="music-player"
      aria-label="Background music"
      data-playing={running}
      inert={obscured}
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false)
      }}
    >
      <audio ref={audioRef} preload="none" />
      {expanded && (
        <div className="music-queue" id={playlistId}>
          <div className="music-queue-heading"><span>On the player</span><small>3 tracks · Repeat all</small></div>
          <ol aria-label="Choose a track">
            {tracks.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={`Play ${item.title} by ${item.artist}`}
                  aria-current={index === state.index ? 'true' : undefined}
                  onClick={() => controller.current?.select(index)}
                >
                  <img src={item.cover} alt="" width="36" height="36" loading="lazy" />
                  <span><strong>{item.title}</strong><small>{item.artist}</small></span>
                  <time>{formatTime(item.duration)}</time>
                </button>
              </li>
            ))}
          </ol>
          <div className="music-volume">
            <button type="button" aria-label={silent ? 'Unmute music' : 'Mute music'} onClick={() => controller.current?.toggleMute()}><Icon name={silent ? 'mute' : 'volume'} /></button>
            <input type="range" aria-label="Music volume" min="0" max="1" step="0.01" value={state.volume} onChange={(event) => volumeChanged(Number(event.target.value))} />
            <span>{silent ? 'Muted' : `${Math.round(state.volume * 100)}%`}</span>
          </div>
        </div>
      )}
      <div className="music-card">
        <div className="music-disc" aria-hidden="true">
          <div className="music-disc-spin"><img src={track.cover} alt="" width="64" height="64" /></div>
        </div>
        <div className="music-main">
          <div className="music-title-row">
            <div className="music-title" aria-live="polite" aria-atomic="true"><strong title={track.title}>{track.title}</strong><span>{track.artist}</span></div>
            <button ref={queueButton} type="button" className="music-list-toggle" aria-label={expanded ? 'Close playlist' : 'Open playlist'} aria-expanded={expanded} aria-controls={playlistId} onClick={() => setExpanded((value) => !value)}><Icon name="list" /></button>
          </div>
          <div className="music-transport">
            <button type="button" aria-label="Previous track" onClick={() => controller.current?.skip(-1)}><Icon name="previous" /></button>
            <button type="button" className="music-play" aria-label={canPause ? 'Pause music' : 'Play music'} onClick={() => controller.current?.toggle()}><Icon name={canPause ? 'pause' : 'play'} /></button>
            <button type="button" aria-label="Next track" onClick={() => controller.current?.skip(1)}><Icon name="next" /></button>
            <span className="music-timer">{state.status === 'loading' ? 'Loading…' : `${formatTime(state.time)} / ${formatTime(state.duration)}`}</span>
          </div>
          <input
            className="music-progress"
            type="range"
            aria-label="Track progress"
            aria-valuetext={`${formatTime(state.time)} of ${formatTime(state.duration)}`}
            min="0"
            max={state.duration || 1}
            step="0.1"
            value={Math.min(state.time, state.duration)}
            disabled={!state.ready}
            onChange={(event) => controller.current?.seek(Number(event.target.value))}
            style={{ '--music-progress': `${state.duration ? state.time / state.duration * 100 : 0}%` } as CSSProperties}
          />
        </div>
      </div>
      {state.error && <p className="music-error" role="status">{state.error}</p>}
    </aside>
  )
}
