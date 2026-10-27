import { describe, expect, it } from 'vitest'
import { formatClock, wrapText } from './screenArt'

// A monospace stand-in: every Latin letter is 10 wide and every CJK character 20.
const measure = (text: string) => [...text].reduce((sum, char) => sum + (/[\u4e00-\u9fff]/.test(char) ? 20 : 10), 0)

describe('wrapText', () => {
  it('wraps Latin text between words and never exceeds the width', () => {
    const lines = wrapText(measure, 'one two three four five', 100, 5)
    expect(lines).toEqual(['one two', 'three four', 'five'])
    lines.forEach((line) => expect(measure(line)).toBeLessThanOrEqual(100))
  })

  it('breaks CJK text between characters', () => {
    expect(wrapText(measure, '新传批改神器工具', 100, 3)).toEqual(['新传批改神', '器工具'])
  })

  it('keeps a mixed CJK and Latin title within the width', () => {
    const lines = wrapText(measure, '新传批改神器 · AI Grading Assistant', 160, 3)
    expect(lines.length).toBeGreaterThan(1)
    lines.forEach((line) => expect(measure(line)).toBeLessThanOrEqual(160))
    expect(lines.join(' ').replace(/\s+/g, ' ')).toContain('Assistant')
  })

  it('ends the last line with an ellipsis when text is left over', () => {
    const lines = wrapText(measure, 'alpha beta gamma delta epsilon zeta', 100, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    lines.forEach((line) => expect(measure(line)).toBeLessThanOrEqual(100))
  })

  it('returns no lines for empty text', () => {
    expect(wrapText(measure, '   ', 100, 2)).toEqual([])
  })
})

describe('formatClock', () => {
  it('pads hours and minutes', () => {
    expect(formatClock(new Date(2026, 9, 27, 7, 5))).toBe('07:05')
    expect(formatClock(new Date(2026, 9, 27, 23, 41))).toBe('23:41')
  })
})
