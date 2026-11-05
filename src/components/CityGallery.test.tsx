import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import photos from '../data/cityGallery.json'
import { ContentPanel } from './ContentPanel'
import { FilmBench } from './FilmBench'
import { rollsFromCities } from './filmRolls'

describe('city gallery imports', () => {
  it('preserves all 87 photographs across the 13 supplied city folders', () => {
    expect(photos).toHaveLength(87)
    expect(new Set(photos.map(photo => photo.city)).size).toBe(13)
    expect(new Set(photos.map(photo => photo.sourceFile)).size).toBe(87)
    for (const photo of photos) {
      expect(existsSync(`public${photo.src}`), photo.src).toBe(true)
      expect(existsSync(`public${photo.thumbnail}`), photo.thumbnail).toBe(true)
      expect(photo.sourceFile.startsWith(`${photo.cityCn}/`)).toBe(true)
    }
  })
  it('lists every city as a roll without sample gear claims', () => {
    const html = renderToStaticMarkup(createElement(ContentPanel, { hotspot: 'gallery', onClose: () => {} }))
    for (const city of new Set(photos.map(photo => photo.cityCn))) expect(html).toContain(city)
    expect(html).toContain('SELECT A ROLL_')
    expect(html).not.toContain('Leica')
    expect(html).not.toContain('Kodak')
  })
  it('gives the camera panel the same bench, one roll per kind of photograph', () => {
    const html = renderToStaticMarkup(createElement(ContentPanel, { hotspot: 'photos', onClose: () => {} }))
    expect(html).toContain('SELECT A ROLL_')
    for (const category of ['At work', 'Everyday life', 'Internships']) expect(html).toContain(category.toUpperCase())
  })
  it('shows each city roll as a strip of real lazy-loaded frames', () => {
    const rolls = rollsFromCities(photos)
    for (const roll of rolls) {
      const html = renderToStaticMarkup(createElement(FilmBench, { rolls, title: 'test', initialRollId: roll.id }))
      for (const frame of roll.frames) expect(html).toContain(frame.thumb)
      expect(html).toContain('loading="lazy"')
      expect(html.match(/class="fb-frame"/g)).toHaveLength(roll.frames.length)
      expect(html).toContain(`${roll.frames.length} EXP`)
    }
  })
})
