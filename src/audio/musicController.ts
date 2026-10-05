export type Track = {
  id: string
  title: string
  artist: string
  src: string
  cover: string
  duration: number
}

export type MusicState = {
  index: number
  status: 'paused' | 'loading' | 'playing' | 'error'
  time: number
  duration: number
  ready: boolean
  volume: number
  muted: boolean
  error: string
}

export type AudioPort = Pick<HTMLAudioElement,
  'src' | 'preload' | 'currentTime' | 'duration' | 'paused' | 'ended' | 'volume' | 'muted' |
  'play' | 'pause' | 'load' | 'removeAttribute' | 'addEventListener' | 'removeEventListener'
>

export const VOLUME_KEY = 'peter-workbench-music-volume'
export const DEFAULT_VOLUME = 0.3

export function parseVolume(value: string | null) {
  if (value === null || !value.trim()) return DEFAULT_VOLUME
  const volume = Number(value)
  return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_VOLUME
}

export function formatTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function initialMusicState(tracks: Track[], volume = DEFAULT_VOLUME): MusicState {
  return { index: 0, status: 'paused', time: 0, duration: tracks[0]?.duration ?? 0, ready: false, volume, muted: false, error: '' }
}

export class MusicController {
  state: MusicState
  private intendedPlayback = false
  private request = 0
  private generation = 0
  private disposed = false
  private sourceLoaded = false
  private detach: (() => void)[] = []

  constructor(private audio: AudioPort, private tracks: Track[], private changed: (state: MusicState) => void, volume = DEFAULT_VOLUME) {
    if (!tracks.length) throw new Error('A playlist must contain at least one track')
    audio.preload = 'none'
    audio.volume = volume
    this.state = initialMusicState(tracks, audio.volume)
    this.loadTrack(0, false)
  }

  private update(patch: Partial<MusicState>) {
    if (this.disposed) return
    this.state = { ...this.state, ...patch }
    this.changed(this.state)
  }

  private listen(name: string, callback: () => void) {
    const generation = this.generation
    const handler = () => {
      if (!this.disposed && generation === this.generation && (this.sourceLoaded || name === 'volumechange')) callback()
    }
    this.audio.addEventListener(name, handler)
    this.detach.push(() => this.audio.removeEventListener(name, handler))
  }

  private loadTrack(index: number, play: boolean) {
    if (this.disposed) return
    this.request += 1
    this.generation += 1
    this.intendedPlayback = play
    this.detach.forEach((remove) => remove())
    this.detach = []
    this.audio.pause()
    this.update({ index, time: 0, duration: this.tracks[index].duration, ready: false, status: play ? 'loading' : 'paused', error: '' })
    this.sourceLoaded = false
    this.audio.removeAttribute('src')
    this.listen('loadedmetadata', () => {
      const duration = this.audio.duration
      this.update({ ready: Number.isFinite(duration) && duration > 0, duration: Number.isFinite(duration) && duration > 0 ? duration : this.tracks[index].duration })
    })
    this.listen('durationchange', () => {
      if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) this.update({ duration: this.audio.duration })
    })
    this.listen('timeupdate', () => this.update({ time: Math.min(this.state.duration, Math.max(0, this.audio.currentTime || 0)) }))
    this.listen('playing', () => {
      if (this.intendedPlayback && !this.audio.paused) this.update({ status: 'playing', error: '' })
      else if (!this.intendedPlayback) this.audio.pause()
    })
    this.listen('waiting', () => {
      if (this.intendedPlayback) this.update({ status: 'loading' })
    })
    this.listen('pause', () => {
      // A source replacement can queue an old pause event while the new track is loading.
      if (this.state.status === 'playing' && this.audio.paused && !this.audio.ended) {
        this.intendedPlayback = false
        this.request += 1
        this.update({ status: 'paused' })
      }
    })
    this.listen('ended', () => {
      if (this.intendedPlayback) this.loadTrack((this.state.index + 1) % this.tracks.length, true)
    })
    this.listen('error', () => {
      this.request += 1
      this.intendedPlayback = false
      this.audio.pause()
      this.update({ status: 'error', ready: false, error: 'This track could not load. Try Play again or choose another song.' })
    })
    this.listen('volumechange', () => this.update({ volume: this.audio.volume, muted: this.audio.muted }))
    this.audio.load()
    if (play) this.play()
  }

  play() {
    if (this.disposed || (this.state.status === 'playing' && !this.audio.paused)) return
    const ticket = ++this.request
    this.intendedPlayback = true
    // Some browsers still fetch on load() despite preload=none. Keep src absent until Play.
    if (!this.sourceLoaded) {
      this.sourceLoaded = true
      this.audio.src = this.tracks[this.state.index].src
      this.audio.load()
    } else if (this.state.status === 'error') this.audio.load()
    this.update({ status: 'loading', error: '' })
    // Called synchronously from the user's gesture; never autoplay on mount or restore.
    void this.audio.play().then(() => {
      if (this.disposed || ticket !== this.request) return
      if (!this.intendedPlayback) this.audio.pause()
    }).catch((error: unknown) => {
      if (this.disposed || ticket !== this.request) return
      this.intendedPlayback = false
      const blocked = error instanceof Error && error.name === 'NotAllowedError'
      this.update({ status: 'error', error: blocked ? 'Your browser blocked playback. Tap Play to try again.' : 'Playback could not start. Try again or choose another song.' })
    })
  }

  pause() {
    this.request += 1
    this.intendedPlayback = false
    this.audio.pause()
    this.update({ status: 'paused' })
  }

  toggle() {
    if (this.intendedPlayback) this.pause()
    else this.play()
  }

  skip(direction: -1 | 1) {
    this.loadTrack((this.state.index + direction + this.tracks.length) % this.tracks.length, this.intendedPlayback)
  }

  select(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= this.tracks.length) return
    if (index === this.state.index) this.play()
    else this.loadTrack(index, true)
  }

  seek(time: number) {
    if (!this.state.ready || !Number.isFinite(time)) return
    const value = Math.max(0, Math.min(time, this.state.duration))
    try {
      this.audio.currentTime = value
      this.update({ time: value })
    } catch {
      this.update({ error: 'Seeking is not available yet. Wait for the track to load.' })
    }
  }

  setVolume(volume: number) {
    if (!Number.isFinite(volume)) return
    this.audio.volume = Math.max(0, Math.min(1, volume))
    if (volume > 0) this.audio.muted = false
    this.update({ volume: this.audio.volume, muted: this.audio.muted })
  }

  toggleMute() {
    if (this.audio.volume === 0) {
      this.setVolume(DEFAULT_VOLUME)
      return
    }
    this.audio.muted = !this.audio.muted
    this.update({ muted: this.audio.muted })
  }

  dispose() {
    this.disposed = true
    this.request += 1
    this.generation += 1
    this.intendedPlayback = false
    this.detach.forEach((remove) => remove())
    this.detach = []
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
  }
}
