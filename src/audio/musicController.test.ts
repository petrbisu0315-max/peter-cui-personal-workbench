import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_VOLUME, formatTime, MusicController, parseVolume } from './musicController'
import type { AudioPort } from './musicController'
import tracks from '../data/music.json'

class TestAudio extends EventTarget implements AudioPort {
  src = ''
  preload: AudioPort['preload'] = ''
  currentTime = 0
  duration = NaN
  paused = true
  ended = false
  volume = 1
  muted = false
  supportsRanges = true
  get seekable() { return { length: 1, start: () => 0, end: () => this.supportsRanges ? this.duration : 0 } }
  play = vi.fn(() => Promise.resolve())
  load = vi.fn(() => { this.currentTime = 0; this.duration = NaN; this.ended = false })
  pause = vi.fn(() => { this.paused = true; this.emit('pause') })
  removeAttribute(name: string) { if (name === 'src') this.src = '' }
  emit(name: string) { this.dispatchEvent(new Event(name)) }
  start() { this.paused = false; this.ended = false; this.emit('playing') }
  metadata(duration: number) { this.duration = duration; this.emit('loadedmetadata') }
}

function setup() {
  const audio = new TestAudio()
  const update = vi.fn()
  const player = new MusicController(audio, tracks, update)
  return { audio, player, update }
}

const flush = async () => { await Promise.resolve(); await Promise.resolve() }

describe('background music', () => {
  it('preserves verified song order and starts silent without preloading audio', () => {
    const { audio, player } = setup()
    expect(tracks.map((t) => `${t.artist}: ${t.title}`)).toEqual(['Chezile: Beanie', 'Ryan Gebhardt: Ladyfingers', 'RIX / Zy: 阳光灿烂的日子'])
    expect(audio.preload).toBe('none')
    expect(audio.src).toBe('')
    expect(audio.play).not.toHaveBeenCalled()
    expect(player.state.status).toBe('paused')
    expect(audio.volume).toBe(DEFAULT_VOLUME)
    player.dispose()
  })

  it('waits for actual playback before reporting playing, and pauses promptly', () => {
    const { audio, player } = setup()
    player.toggle()
    expect(player.state.status).toBe('loading')
    expect(audio.play).toHaveBeenCalledOnce()
    audio.start()
    expect(player.state.status).toBe('playing')
    player.toggle()
    expect(player.state.status).toBe('paused')
    expect(audio.paused).toBe(true)
    player.dispose()
  })

  it('keeps paused track navigation silent and wraps in both directions', () => {
    const { audio, player } = setup()
    player.skip(-1)
    expect(player.state.index).toBe(2)
    player.skip(1)
    expect(player.state.index).toBe(0)
    expect(player.state.time).toBe(0)
    expect(audio.play).not.toHaveBeenCalled()
    player.dispose()
  })

  it('continues playback when skipping, and loops after the last song ends', () => {
    const { audio, player } = setup()
    player.play()
    audio.start()
    player.skip(1)
    expect(player.state.index).toBe(1)
    expect(audio.play).toHaveBeenCalledTimes(2)
    player.select(2)
    audio.start()
    audio.ended = true
    audio.paused = true
    audio.emit('pause')
    audio.emit('ended')
    expect(player.state.index).toBe(0)
    expect(player.state.status).toBe('loading')
    expect(audio.src).toBe(tracks[0].src)
    player.dispose()
  })

  it('does not restart or stick in loading when selecting the playing song', () => {
    const { audio, player } = setup()
    player.play()
    audio.start()
    player.select(0)
    expect(player.state.status).toBe('playing')
    expect(audio.play).toHaveBeenCalledTimes(1)
    player.dispose()
  })

  it('ignores an old play rejection after quickly changing tracks', async () => {
    const { audio, player } = setup()
    let rejectOld!: (error: Error) => void
    audio.play.mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectOld = reject }))
    player.play()
    player.skip(1)
    audio.start()
    rejectOld(new Error('aborted old source'))
    await flush()
    expect(player.state.index).toBe(1)
    expect(player.state.status).toBe('playing')
    expect(player.state.error).toBe('')
    player.dispose()
  })

  it('cancels a pending playback request without later switching back to playing', async () => {
    const { audio, player } = setup()
    let resolvePlay!: () => void
    audio.play.mockImplementationOnce(() => new Promise<void>((resolve) => { resolvePlay = resolve }))
    player.play()
    player.pause()
    audio.start()
    resolvePlay()
    await flush()
    expect(audio.paused).toBe(true)
    expect(player.state.status).toBe('paused')
    player.dispose()
  })

  it('reports a blocked play request and allows a successful retry', async () => {
    const { audio, player } = setup()
    const error = new Error('blocked')
    error.name = 'NotAllowedError'
    audio.play.mockRejectedValueOnce(error)
    player.play()
    await flush()
    expect(player.state.status).toBe('error')
    expect(player.state.error).toContain('browser blocked')
    player.play()
    audio.start()
    expect(player.state.status).toBe('playing')
    expect(player.state.error).toBe('')
    player.dispose()
  })

  it('treats a refused autoplay as waiting rather than an error, and still plays on retry', async () => {
    const { audio, player } = setup()
    const blocked = new Error('blocked')
    blocked.name = 'NotAllowedError'
    audio.play.mockRejectedValueOnce(blocked)
    player.autoplay()
    expect(player.state.status).toBe('loading')
    await flush()
    expect(player.state.status).toBe('paused')
    expect(player.state.error).toBe('')
    expect(audio.play).toHaveBeenCalledOnce()
    player.autoplay()
    audio.start()
    expect(player.state.status).toBe('playing')
    expect(player.state.error).toBe('')
    player.dispose()
  })

  it('starts the first track immediately when autoplay is allowed', async () => {
    const { audio, player } = setup()
    player.autoplay()
    expect(audio.src).toBe(tracks[0].src)
    expect(audio.preload).toBe('none')
    audio.start()
    expect(player.state.status).toBe('playing')
    expect(player.state.index).toBe(0)
    // A second autoplay request must not restart a playing track.
    const calls = audio.play.mock.calls.length
    player.autoplay()
    expect(audio.play).toHaveBeenCalledTimes(calls)
    player.dispose()
  })

  it('still reports a genuine media failure as an error when autoplaying', async () => {
    const { audio, player } = setup()
    audio.play.mockRejectedValueOnce(new Error('decode failed'))
    player.autoplay()
    await flush()
    expect(player.state.status).toBe('error')
    expect(player.state.error).toContain('could not start')
    player.dispose()
  })

  it('surfaces media errors without endlessly skipping failed tracks', () => {
    const { audio, player } = setup()
    player.play()
    audio.emit('error')
    expect(player.state.status).toBe('error')
    expect(player.state.index).toBe(0)
    expect(player.state.error).toContain('could not load')
    player.skip(1)
    expect(player.state.status).toBe('paused')
    player.dispose()
  })

  it('waits for metadata before seeking and clamps requests', () => {
    const { audio, player } = setup()
    player.seek(20)
    expect(audio.currentTime).toBe(0)
    player.play()
    audio.metadata(132)
    player.seek(40)
    expect(audio.currentTime).toBe(40)
    player.seek(900)
    expect(audio.currentTime).toBe(132)
    player.seek(-10)
    expect(audio.currentTime).toBe(0)
    player.seek(NaN)
    expect(audio.currentTime).toBe(0)
    player.dispose()
  })

  it('handles volume, mute and zero-volume recovery', () => {
    const { audio, player } = setup()
    player.setVolume(0.42)
    player.toggleMute()
    expect(audio.muted).toBe(true)
    player.toggleMute()
    expect(audio.volume).toBe(0.42)
    expect(audio.muted).toBe(false)
    player.setVolume(0)
    player.toggleMute()
    expect(audio.volume).toBe(DEFAULT_VOLUME)
    player.setVolume(10)
    expect(audio.volume).toBe(1)
    player.dispose()
  })

  it('removes event listeners and releases audio on unmount', () => {
    const { audio, player, update } = setup()
    player.play()
    player.dispose()
    const calls = update.mock.calls.length
    audio.start()
    audio.emit('timeupdate')
    expect(update).toHaveBeenCalledTimes(calls)
    expect(audio.src).toBe('')
    player.play()
    expect(audio.play).toHaveBeenCalledTimes(1)
  })

  it('buffers a range-less CDN response only when seeking needs it and resumes', async () => {
    const audio = new TestAudio()
    audio.supportsRanges = false
    const release = vi.fn()
    const loader = vi.fn(async () => ({ url: 'blob:track', release }))
    const player = new MusicController(audio, tracks, vi.fn(), DEFAULT_VOLUME, loader)
    player.play()
    audio.metadata(132)
    audio.start()
    expect(loader).not.toHaveBeenCalled()
    player.seek(60)
    await flush()
    expect(audio.src).toBe('blob:track')
    audio.metadata(132)
    expect(audio.currentTime).toBe(60)
    audio.start()
    expect(player.state.status).toBe('playing')
    player.skip(1)
    expect(release).toHaveBeenCalledOnce()
    player.dispose()
  })

  it('does not let a late seek buffer overwrite a newly selected track', async () => {
    const audio = new TestAudio()
    audio.supportsRanges = false
    const release = vi.fn()
    let finish!: (value: { url: string; release: () => void }) => void
    const loader = vi.fn(() => new Promise<{ url: string; release: () => void }>((resolve) => { finish = resolve }))
    const player = new MusicController(audio, tracks, vi.fn(), DEFAULT_VOLUME, loader)
    player.play()
    audio.metadata(132)
    audio.start()
    player.seek(60)
    player.skip(1)
    finish({ url: 'blob:stale', release })
    await flush()
    expect(audio.src).toBe(tracks[1].src)
    expect(release).toHaveBeenCalledOnce()
    player.dispose()
  })

  it('honors pause while a seek buffer is downloading', async () => {
    const audio = new TestAudio()
    audio.supportsRanges = false
    const player = new MusicController(audio, tracks, vi.fn(), DEFAULT_VOLUME, async () => ({ url: 'blob:paused', release: vi.fn() }))
    player.play()
    audio.metadata(132)
    audio.start()
    player.seek(60)
    player.pause()
    await flush()
    audio.metadata(132)
    expect(audio.currentTime).toBe(60)
    expect(audio.paused).toBe(true)
    expect(player.state.status).toBe('paused')
    player.dispose()
  })

  it('formats time and safely restores only a valid volume preference', () => {
    expect(formatTime(164.9)).toBe('2:44')
    expect(formatTime(Infinity)).toBe('0:00')
    for (const value of [null, '', 'NaN', 'garbage']) expect(parseVolume(value)).toBe(DEFAULT_VOLUME)
    expect(parseVolume('0')).toBe(0)
    expect(parseVolume('0.42')).toBe(0.42)
    expect(parseVolume('100')).toBe(1)
    expect(parseVolume('-3')).toBe(0)
  })
})
