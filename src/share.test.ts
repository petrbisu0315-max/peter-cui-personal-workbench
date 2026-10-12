import { describe, expect, it } from 'vitest'
import { CANONICAL_URL, shareTarget } from './share'

describe('share target', () => {
  it('keeps the live origin, so a custom domain needs no regeneration', () => {
    expect(shareTarget('https://peter-cui-workbench.pages.dev/')).toBe('https://peter-cui-workbench.pages.dev/')
    expect(shareTarget('https://petercui.com/about?x=1#y')).toBe('https://petercui.com/')
  })

  it('never encodes a local address a phone could not reach', () => {
    expect(shareTarget('http://localhost:4173/')).toBe(CANONICAL_URL)
    expect(shareTarget('http://127.0.0.1:4173/')).toBe(CANONICAL_URL)
    expect(shareTarget('http://0.0.0.0:4173/')).toBe(CANONICAL_URL)
    expect(shareTarget('http://macbook.local:4173/')).toBe(CANONICAL_URL)
  })

  it('falls back to the public address for anything unusable', () => {
    expect(shareTarget('not a url')).toBe(CANONICAL_URL)
    expect(shareTarget('file:///Users/peter/index.html')).toBe(CANONICAL_URL)
    expect(shareTarget('')).toBe(CANONICAL_URL)
  })

  it('always returns a bare https origin ending in a slash', () => {
    const target = shareTarget('https://example.com/deep/path')
    expect(target).toBe('https://example.com/')
    expect(target.endsWith('/')).toBe(true)
  })
})
