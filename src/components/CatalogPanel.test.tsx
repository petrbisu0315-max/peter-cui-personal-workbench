import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import books from '../data/books.json'
import movies from '../data/movies.json'
import { CatalogPanel, PersonalRating } from './CatalogPanel'

const countBy = (items: { kind: string }[], kind: string) => items.filter((item) => item.kind === kind).length

describe('approved catalog import', () => {
  it('preserves the 35 confirmed read entries including magazines and the two-book collection', () => {
    expect(books).toHaveLength(35)
    expect(new Set(books.map((b) => b.id)).size).toBe(35)
    expect(books.every((book) => book.status === 'finished')).toBe(true)
    expect(countBy(books, 'book')).toBe(32)
    expect(countBy(books, 'periodical')).toBe(2)
    expect(countBy(books, 'collection')).toBe(1)
    expect(books.find((b) => b.kind === 'collection')?.volumes).toHaveLength(2)
  })

  it('has a verified author, original short summary and source link for every shelf entry', () => {
    for (const book of books) {
      expect(book.author.length).toBeGreaterThan(1)
      expect(book.summary.length).toBeGreaterThan(20)
      expect(book.summary.length).toBeLessThan(80)
      expect(new URL(book.url).protocol).toBe('https:')
    }
    expect(books.filter((book) => book.sourceLabel === 'Douban')).toHaveLength(30)
    expect(books.find((book) => book.id === 'weread-05')?.author).toBe('张秋子')
    expect(books.find((book) => book.id === 'weread-14')?.author).toBe('戴维·莫利')
    expect(books.find((book) => book.id === 'weread-25')?.author).toContain('主编')
  })

  it('includes only the first 30 watched records, separating series and stage recordings', () => {
    expect(movies).toHaveLength(30)
    expect(new Set(movies.map((movie) => movie.id)).size).toBe(30)
    expect(countBy(movies, 'film')).toBe(21)
    expect(countBy(movies, 'series')).toBe(8)
    expect(countBy(movies, 'stage_recording')).toBe(1)
    expect(movies.every((movie) => movie.status === 'watched')).toBe(true)
    expect(movies.filter((movie) => movie.rating === null)).toHaveLength(4)
    expect(movies.slice(0, 4).every((movie) => movie.rating === null)).toBe(true)
    expect(movies.find((movie) => movie.id === 'douban-20')?.rating).toBe(3)
  })

  it('allows only public watchlist fields, excluding personal reviews and marking dates', () => {
    const publicKeys = new Set(['id', 'title', 'alternateTitle', 'year', 'kind', 'status', 'rating', 'poster'])
    for (const movie of movies) {
      expect(Object.keys(movie).every((key) => publicKeys.has(key))).toBe(true)
      expect(movie.rating === null || (Number.isInteger(movie.rating) && movie.rating >= 1 && movie.rating <= 5)).toBe(true)
    }
  })

  it('resolves all 65 cropped cover images without external hotlinks', () => {
    const images = import.meta.glob('../../public/images/catalog/*.webp', { query: '?url', import: 'default', eager: true })
    for (const image of [...books.map((book) => book.cover), ...movies.map((movie) => movie.poster)]) {
      expect(image).toMatch(/^\/images\/catalog\/(book|watch)-\d{2}-[a-f0-9]{10}\.webp$/)
      expect(images).toHaveProperty(`../../public${image}`)
    }
  })
})

describe('catalog display', () => {
  it('renders Chinese titles and authors in the English reading interface', () => {
    const html = renderToStaticMarkup(createElement(CatalogPanel, { type: 'books' }))
    expect(html).toContain('Search books')
    expect(html).toContain('35 of 35 read titles')
    expect(html).toContain('张秋子')
    expect(html).toContain('Magazine')
    expect(html.match(/data-catalog-id=/g)).toHaveLength(35)
  })

  it('shows personal stars without substituting missing ratings with zero', () => {
    const html = renderToStaticMarkup(createElement(CatalogPanel, { type: 'movies' }))
    expect(html).toContain('30 of 30 watched titles')
    expect(html.match(/data-catalog-id=/g)).toHaveLength(30)
    expect(html.match(/Not rated/g)).toHaveLength(4)
    expect(html).toContain('Your rating: 3 out of 5')
    expect(html).not.toContain('Your rating: 0 out of 5')
    expect(html).not.toContain('catalog-card-summary')
  })

  it.each([null, undefined, 0, -1, 6, 3.5, NaN])('safely renders an invalid or absent rating %s', (rating) => {
    expect(renderToStaticMarkup(createElement(PersonalRating, { rating }))).toContain('Not rated')
  })
})
