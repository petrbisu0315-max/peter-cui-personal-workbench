import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContentPanel } from './ContentPanel'
import research from '../data/research.json'

const HAN = /[\u4e00-\u9fff]/
const LATIN_OK = new Set(['GPA'])

const html = renderToStaticMarkup(createElement(ContentPanel, { hotspot: 'research', onClose: () => {} }))

describe('research panel', () => {
  it('lists the papers with their Chinese titles and fully Chinese metadata', () => {
    for (const item of research) {
      expect(item.title, `${item.id} title`).toMatch(HAN)
      expect(item.summary, `${item.id} summary`).toMatch(HAN)
      expect(item.authors, `${item.id} authors`).toMatch(HAN)
      expect(item.journal, `${item.id} journal`).toMatch(HAN)
      expect(item.issue, `${item.id} issue`).toMatch(HAN)
      expect(item.pages, `${item.id} pages`).toMatch(HAN)
      for (const tag of item.tags) {
        if (LATIN_OK.has(tag)) continue
        expect(tag, `${item.id} tag`).toMatch(HAN)
      }
    }
  })

  it('shows a real first-page thumbnail instead of a placeholder label', () => {
    for (const item of research) {
      expect(item.thumbnail, `${item.id} thumbnail`).toMatch(/^\/images\/research\/[a-z0-9-]+\.webp$/)
      expect(html).toContain(item.thumbnail)
      // The old placeholder was a bare "PDF" label in the left column.
      expect(html).not.toContain('<div class="research-date">PDF</div>')
    }
  })

  it('resolves every thumbnail and attachment to a local file', () => {
    const images = import.meta.glob('../../public/images/research/*.webp', { query: '?url', import: 'default', eager: true })
    const pdfs = import.meta.glob('../../public/documents/research/*.pdf', { query: '?url', import: 'default', eager: true })
    for (const item of research) {
      expect(images).toHaveProperty(`../../public${item.thumbnail}`)
      expect(pdfs).toHaveProperty(`../../public${item.attachment}`)
    }
  })

  it('renders the Chinese titles and the bibliographic line', () => {
    expect(html).toContain('从客观事实到关系真实')
    expect(html).toContain('网飞韩国电视剧如何')
    expect(html).toContain('郑州大学学报（哲学社会科学版）')
    expect(html).toContain('开放时代')
    expect(html).toContain('吕鹏 · 崔宇杰')
  })
})
