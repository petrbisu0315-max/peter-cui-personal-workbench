import { describe, expect, it } from 'vitest'
import cityGallery from '../data/cityGallery.json'
import photos from '../data/photos.json'
import { benchColumns, benchLayout, edgeCode, LABEL_STYLES, rollsFromCities, rollsFromPersonal } from './filmRolls'

describe('rolls', () => {
  const rolls = rollsFromCities(cityGallery)

  it('makes one roll per city and keeps every photograph on exactly one roll', () => {
    expect(rolls).toHaveLength(13)
    expect(rolls.reduce((sum, roll) => sum + roll.frames.length, 0)).toBe(cityGallery.length)
    const ids = rolls.flatMap((roll) => roll.frames.map((frame) => frame.id))
    expect(new Set(ids).size).toBe(cityGallery.length)
  })

  it('gives each roll a unique id and a label style that exists', () => {
    expect(new Set(rolls.map((roll) => roll.id)).size).toBe(rolls.length)
    rolls.forEach((roll) => expect(LABEL_STYLES[roll.style]).toBeDefined())
  })

  it('prints a numbered edge code per frame', () => {
    expect(edgeCode(rolls[0], 2)).toBe(`${rolls[0].name.toUpperCase()} ${rolls[0].iso} · 03`)
  })

  it('groups personal photographs by category and skips those without a file', () => {
    const personal = rollsFromPersonal(photos)
    expect(personal.reduce((sum, roll) => sum + roll.frames.length, 0)).toBe(photos.filter((p) => p.src).length)
    expect(rollsFromPersonal([{ id: 'x', title: 'x', category: 'Empty' }])).toEqual([])
  })
})

describe('bench layout', () => {
  it('is deterministic and places every can inside the bench', () => {
    const a = benchLayout(13, 5)
    expect(benchLayout(13, 5)).toEqual(a)
    expect(a).toHaveLength(13)
    a.forEach((can) => {
      expect(Math.abs(can.x)).toBeLessThan(6)
      expect(Math.abs(can.z)).toBeLessThan(5)
      expect(Math.abs(can.lean)).toBeLessThan(0.6)
    })
  })

  it('keeps cans clear of each other', () => {
    const cans = benchLayout(13, 5)
    for (let i = 0; i < cans.length; i += 1) {
      for (let j = i + 1; j < cans.length; j += 1) {
        const distance = Math.hypot(cans[i].x - cans[j].x, cans[i].z - cans[j].z)
        expect(distance, `${i}-${j}`).toBeGreaterThan(1.8)
      }
    }
  })

  it('picks fewer columns for narrower benches', () => {
    expect(benchColumns(2.2, 13)).toBe(5)
    expect(benchColumns(1.4, 13)).toBe(4)
    expect(benchColumns(0.5, 13)).toBe(2)
    expect(benchColumns(2.2, 3)).toBe(3)
  })
})
