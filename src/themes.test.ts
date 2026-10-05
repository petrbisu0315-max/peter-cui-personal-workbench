import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { advanceThemeWeights, BACKGROUND_THEMES, environmentIsDark, resolveTheme, THEME_LIST } from './themes'
import { EnvironmentPicker } from './components/EnvironmentPicker'

describe('environment selection', () => {
  it('preserves the four existing theme IDs and defaults safely', () => {
    expect(THEME_LIST.map((theme) => theme.id)).toEqual(['home', 'aurora', 'prairie', 'ocean'])
    for (const invalid of [null, '', 'obsolete', '__proto__', 'constructor']) expect(resolveTheme(invalid)).toBe('home')
    for (const theme of THEME_LIST) expect(resolveTheme(theme.id)).toBe(theme.id)
  })

  it('keeps transition weights bounded and normalized even on a slow frame', () => {
    let weights = [1, 0, 0, 0]
    for (const theme of THEME_LIST) {
      for (const delta of [0, .016, .5, 5, 100]) {
        weights = advanceThemeWeights(weights, theme.id, delta, false)
        expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
        expect(weights.every((v) => v >= 0 && v <= 1)).toBe(true)
      }
    }
  })

  it('switches instantly without animation for reduced motion', () => {
    expect(advanceThemeWeights([1, 0, 0, 0], 'aurora', .016, true)).toEqual([0, 1, 0, 0])
    expect(advanceThemeWeights([.2, .3, .1, .4], 'home', 0, true)).toEqual([1, 0, 0, 0])
  })

  it('provides distinct but readable day and evening lighting for every environment', () => {
    for (const theme of THEME_LIST) {
      expect(theme.night.hemiIntensity).toBeGreaterThanOrEqual(1.2)
      expect(theme.night.hemiIntensity).toBeLessThan(theme.palette.hemiIntensity)
      expect(theme.night.background).not.toBe(theme.palette.background)
      expect(environmentIsDark(theme.id, 'night')).toBe(true)
    }
    expect(environmentIsDark('home', 'day')).toBe(false)
    expect(environmentIsDark('aurora', 'day')).toBe(true)
    expect(BACKGROUND_THEMES.home.name).toBe('Interior')
  })

  it('ships the bedroom preview and preserves fallback previews for the other themes', () => {
    expect(BACKGROUND_THEMES.home.preview).toMatch(/home-bedroom-[a-f0-9]+\.webp$/)
    const previews = import.meta.glob('../public/images/environments/*.webp', { query: '?url', import: 'default', eager: true })
    for (const theme of THEME_LIST) {
      const path = theme.preview ?? `/images/environments/${theme.id}.webp`
      expect(previews).toHaveProperty(`../public${path}`)
    }
  })

  it('renders a labeled, collapsed control without preloading an overlay', () => {
    const html = renderToStaticMarkup(createElement(EnvironmentPicker, { theme: 'ocean', onChange: () => undefined }))
    expect(html).toContain('Environment: Coast')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('radiogroup')
  })
})
