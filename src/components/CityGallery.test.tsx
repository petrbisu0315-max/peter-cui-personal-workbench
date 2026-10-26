import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import photos from '../data/cityGallery.json'
import { ContentPanel } from './ContentPanel'

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
  it('renders real lazy-loaded photos and every city filter without sample gear claims', () => {
    const html = renderToStaticMarkup(createElement(ContentPanel, { hotspot: 'gallery', onClose: () => {} }))
    for (const photo of photos) expect(html).toContain(photo.thumbnail)
    for (const city of new Set(photos.map(photo => photo.cityCn))) expect(html).toContain(city)
    expect(html).toContain('loading="lazy"')
    expect(html).not.toContain('Leica')
    expect(html).not.toContain('Kodak')
    expect(html).not.toContain('Beijing (北京)')
  })
})
