import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MusicPlayer } from './MusicPlayer'

describe('compact CD player', () => {
  it('initially exposes only the CD trigger, with silent audio and hidden controls', () => {
    const html = renderToStaticMarkup(createElement(MusicPlayer))
    expect(html).toContain('aria-label="Open music player"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('data-open="false"')
    expect(html).toContain('hidden="" role="region" aria-label="Music player controls"')
    expect(html).toContain('<audio preload="none"></audio>')
    expect(html).not.toContain('autoplay')
    expect(html.match(/class="music-disc-spin"/g)).toHaveLength(1)
    expect(html).not.toContain('class="music-queue"')
  })

  it('keeps covered player controls inert without removing the audio element', () => {
    const html = renderToStaticMarkup(createElement(MusicPlayer, { obscured: true }))
    expect(html).toContain('inert=""')
    expect(html.match(/<audio/g)).toHaveLength(1)
    expect(html).toContain('data-playing="false"')
  })
})
