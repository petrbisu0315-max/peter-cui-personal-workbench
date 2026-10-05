import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSeekableSource } from './seekableSource'

afterEach(() => vi.unstubAllGlobals())

describe('seekable media buffer', () => {
  it('creates a revocable local media URL from a successful full response', async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } }))
    vi.stubGlobal('fetch', fetcher)
    const signal = new AbortController().signal
    const result = await loadSeekableSource('/audio/track.mp3', signal)
    expect(fetcher).toHaveBeenCalledWith('/audio/track.mp3', { signal, cache: 'force-cache' })
    expect(result.url.startsWith('blob:')).toBe(true)
    result.release()
  })

  it('rejects errors and oversized responses instead of buffering arbitrary assets', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('missing', { status: 404 })))
    await expect(loadSeekableSource('/audio/track.mp3', new AbortController().signal)).rejects.toThrow('download failed')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('too big', { headers: { 'Content-Length': '9000000' } })))
    await expect(loadSeekableSource('/audio/track.mp3', new AbortController().signal)).rejects.toThrow('buffer limit')
  })
})
