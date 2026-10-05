import { useEffect, useMemo, useRef, useState } from 'react'
import booksData from '../data/books.json'
import moviesData from '../data/movies.json'
import type { BookItem, MovieItem } from '../types/content'
import './CatalogPanel.css'

type Entry = {
  id: string
  title: string
  secondary?: string
  summary?: string
  url?: string
  sourceLabel?: string
  kind: string
  cover?: string
  year?: number
  status: string
  rating?: number | null
  volumes?: string[]
}

const books: Entry[] = (booksData as BookItem[]).map((book) => ({
  id: book.id, title: book.title, secondary: book.author, kind: book.kind ?? 'book',
  cover: book.cover, status: book.status === 'finished' ? 'Read' : 'Reading', volumes: book.volumes,
  summary: book.summary, url: book.url, sourceLabel: book.sourceLabel,
}))
const movies: Entry[] = (moviesData as MovieItem[]).map((movie) => ({
  id: movie.id, title: movie.title, secondary: movie.alternateTitle, kind: movie.kind ?? 'film',
  cover: movie.poster, status: 'Watched', year: movie.year, rating: movie.rating,
}))
const labels: Record<string, string> = { book: 'Book', collection: 'Collection', periodical: 'Magazine', film: 'Film', series: 'Series', stage_recording: 'Stage recording' }
const bookFilters = [['all', 'All'], ['book', 'Books'], ['collection', 'Collections'], ['periodical', 'Magazines']]
const movieFilters = [['all', 'All'], ['film', 'Films'], ['series', 'Series'], ['stage_recording', 'Stage']]

export function PersonalRating({ rating }: { rating?: number | null }) {
  if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 5) return <span className="catalog-unrated">Not rated</span>
  return (
    <span className="catalog-rating" role="img" aria-label={`Your rating: ${rating} out of 5`}>
      <span aria-hidden="true">{'★'.repeat(rating)}<i>{'★'.repeat(5 - rating)}</i></span>
    </span>
  )
}

function Artwork({ entry, large = false }: { entry: Entry; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`catalog-art${large ? ' catalog-art-large' : ''}`}>
      {entry.cover && !failed ? <img src={entry.cover} alt={large ? `${entry.title} cover` : ''} loading={large ? 'eager' : 'lazy'} onError={() => setFailed(true)} /> : <span className="catalog-art-missing">{entry.title}</span>}
    </div>
  )
}

export function CatalogPanel({ type }: { type: 'books' | 'movies' }) {
  const entries = type === 'books' ? books : movies
  const filters = type === 'books' ? bookFilters : movieFilters
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const lastSelected = useRef<string | null>(null)
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return entries.filter((entry) => (kind === 'all' || entry.kind === kind) && [entry.title, entry.secondary, ...(entry.volumes ?? [])].some((value) => value?.toLocaleLowerCase().includes(needle)))
  }, [entries, kind, query])
  const selected = filtered.find((entry) => entry.id === selectedId)
  const selectedIndex = selected ? filtered.indexOf(selected) : -1

  useEffect(() => {
    if (selectedId) {
      lastSelected.current = selectedId
      heading.current?.focus()
    } else if (lastSelected.current) {
      root.current?.querySelector<HTMLButtonElement>(`[data-catalog-id="${lastSelected.current}"]`)?.focus()
    }
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setSelectedId(null)
    }
    window.addEventListener('keydown', escape, true)
    return () => window.removeEventListener('keydown', escape, true)
  }, [selectedId])

  const show = (entry: Entry) => {
    setSelectedId(entry.id)
    root.current?.closest('.panel-body')?.scrollTo({ top: 0 })
  }

  return (
    <div className="catalog-panel" ref={root}>
      {selected ? (
        <>
          <div className="catalog-detail-nav">
            <button type="button" onClick={() => setSelectedId(null)}>← Back to {type === 'books' ? 'shelf' : 'watchlist'}</button>
            <div>
              <button type="button" disabled={selectedIndex <= 0} onClick={() => show(filtered[selectedIndex - 1])}>Previous</button>
              <button type="button" disabled={selectedIndex >= filtered.length - 1} onClick={() => show(filtered[selectedIndex + 1])}>Next</button>
            </div>
          </div>
          <article className="catalog-detail">
            <Artwork entry={selected} key={selected.id} large />
            <div className="catalog-detail-copy">
              <p className="catalog-detail-meta">{labels[selected.kind]}{selected.year ? ` · ${selected.year}` : ''}</p>
              <h3 ref={heading} tabIndex={-1}>{selected.title}</h3>
              {selected.secondary && <p className="catalog-secondary">{selected.secondary}</p>}
              {selected.summary && <p className="catalog-book-summary">{selected.summary}</p>}
              <p className="catalog-status">{selected.status}</p>
              {type === 'movies' && <div className="catalog-personal-rating"><span>Your rating</span><PersonalRating rating={selected.rating} /></div>}
              {selected.volumes && <div className="catalog-volumes"><span>Included in this collection</span><ul>{selected.volumes.map((title) => <li key={title}>{title}</li>)}</ul></div>}
              {selected.url && <div className="catalog-source"><a href={selected.url} target="_blank" rel="noreferrer">{selected.sourceLabel === 'Douban' ? 'Reference on Douban' : `${selected.sourceLabel ?? 'Book'} source`}</a><small>Content overview, not a personal review. Reference editions may differ from the WeRead copy.</small></div>}
            </div>
          </article>
        </>
      ) : (
        <>
          <div className="catalog-toolbar">
            <div className="catalog-filters" role="group" aria-label={type === 'books' ? 'Reading categories' : 'Watchlist categories'}>
              {filters.map(([id, name]) => <button key={id} type="button" aria-pressed={id === kind} onClick={() => setKind(id)}>{name}</button>)}
            </div>
            <input type="search" aria-label={type === 'books' ? 'Search books' : 'Search watchlist'} placeholder="Search titles…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="catalog-summary"><span role="status">{filtered.length} of {entries.length} {type === 'books' ? 'read titles' : 'watched titles'}</span>{type === 'movies' && <span>Personal ratings · 5 stars</span>}</div>
          {filtered.length ? <div className="catalog-grid">
            {filtered.map((entry) => <button className="catalog-card" key={entry.id} data-catalog-id={entry.id} type="button" onClick={() => show(entry)} aria-label={`Open ${entry.title}`}>
              <Artwork entry={entry} />
              <strong>{entry.title}</strong>
              {type === 'books' && entry.secondary && <span className="catalog-author">{entry.secondary}</span>}
              {type === 'books' && entry.summary && <span className="catalog-card-summary">{entry.summary}</span>}
              <span className="catalog-card-meta">{labels[entry.kind]}{entry.year ? ` · ${entry.year}` : ''}</span>
              {type === 'movies' && <PersonalRating rating={entry.rating} />}
            </button>)}
          </div> : <div className="catalog-empty"><p>No matching titles.</p><button type="button" onClick={() => { setQuery(''); setKind('all') }}>Reset filters</button></div>}
        </>
      )}
    </div>
  )
}
