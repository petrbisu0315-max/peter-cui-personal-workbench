import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContentPanel, detailHeadings } from './ContentPanel'
import experiences from '../data/experiences.json'

const HAN = /[\u4e00-\u9fff]/
// Acronyms that Chinese copy keeps in Latin script; every other body string is translated.
const LATIN_OK = new Set(['GPA'])

const render = (hotspot: 'experience') =>
  renderToStaticMarkup(createElement(ContentPanel, { hotspot, onClose: () => {} }))

// The internship section reads in Chinese below its level-1 heading: the heading itself
// stays English because it names the role and the product.
describe('internship panel language', () => {
  it('keeps the level-1 role heading in English', () => {
    const html = render('experience')
    expect(html).toContain('AI Product Operations Intern')
    expect(html).toContain('AI Coding &amp; Agent Platform (Enter Pro)')
  })

  it('writes the expanded body in Chinese', () => {
    const html = render('experience')
    expect(html).toContain('工作职责与业务突破')
    expect(html).not.toContain('Key Milestones')
    expect(html).toContain('留存率')
    expect(html).toContain('负责 AI Coding 产品 Enter Pro 海外冷启与商业化增长')
    expect(html).toContain('上海 / 远程')
    expect(html).toContain('工作职责与业务突破')
  })

  it('names each track section after what it actually contains', () => {
    expect(Object.keys(detailHeadings).sort()).toEqual(['campus', 'internship'])
    expect(detailHeadings.internship).toMatch(HAN)
    expect(detailHeadings.campus).toMatch(HAN)
    // An education entry must not be labelled with internship wording.
    expect(detailHeadings.campus).not.toBe(detailHeadings.internship)
  })

  it('shows the current number of internship entries', () => {
    const html = render('experience')
    expect(html).toContain(`(${experiences.filter((item) => item.track === 'internship').length} 段关键经历)`)
  })

  it('leaves no English body copy in the entry data', () => {
    expect(experiences.length).toBeGreaterThan(0)
    for (const entry of experiences) {
      expect(entry.role, `${entry.id} role is the English heading`).not.toMatch(HAN)
      expect(entry.summary, `${entry.id} summary`).toMatch(HAN)
      expect(entry.location ?? '', `${entry.id} location`).toMatch(HAN)
      for (const highlight of entry.highlights) {
        expect(highlight, `${entry.id} highlight`).toMatch(HAN)
        // A translated bullet keeps its Chinese lead-in before the colon.
        expect(highlight.split('：')[0], `${entry.id} bullet lead`).toMatch(HAN)
      }
      for (const metric of entry.metrics) {
        if (LATIN_OK.has(metric.label)) continue
        expect(metric.label, `${entry.id} metric`).toMatch(HAN)
      }
    }
  })
})
