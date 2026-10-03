import { useEffect, useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import projectsData from '../data/projects.json'
import photosData from '../data/photos.json'
import booksData from '../data/books.json'
import moviesData from '../data/movies.json'
import researchData from '../data/research.json'
import experiencesData from '../data/experiences.json'
import resumeData from '../data/resume.json'
import type { BookItem, ExperienceItem, HotspotId, MovieItem, PhotoItem, ProjectItem, ResearchItem, ResumeDocument } from '../types/content'
import { hotspotMeta } from '../experience/hotspots'
import { Whiteboard } from './Whiteboard'

type Props = { hotspot: HotspotId; onClose: () => void }

const projects = projectsData as ProjectItem[]
const photos = photosData as PhotoItem[]
const books = booksData as BookItem[]
const movies = moviesData as MovieItem[]
const research = researchData as ResearchItem[]
const experiences = experiencesData as ExperienceItem[]
const resume = resumeData as ResumeDocument
const ALL = 'All'

function ExternalLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return null
  return <a className="text-link" href={href} target="_blank" rel="noreferrer">{children}</a>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span>TODO</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function ProjectsPanel() {
  return (
    <div className="project-layout">
      <p className="section-note">Only projects that can be verified through work, code or process material are listed here.</p>
      <div className="card-grid">
        {projects.map((item) => (
          <article className="content-card project-card" key={item.id}>
            <p className="item-meta">Completed · Independent project</p>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <ExternalLink href={item.url ?? item.repository}>View project</ExternalLink>
          </article>
        ))}
        <div className="project-todo">
          <span>Next case study</span>
          <p>Opens once the project material is ready.</p>
        </div>
      </div>
    </div>
  )
}

function PhotosPanel() {
  const categories = useMemo(() => [ALL, ...new Set(photos.map((item) => item.category))], [])
  const [category, setCategory] = useState(ALL)
  const [activeId, setActiveId] = useState(photos[0]?.id ?? '')
  const filtered = category === ALL ? photos : photos.filter((item) => item.category === category)
  const active = filtered.find((item) => item.id === activeId) ?? filtered[0]

  useEffect(() => {
    if (active && active.id !== activeId) setActiveId(active.id)
  }, [active, activeId])

  if (!active) return <EmptyState title="Photos are being sorted" description="Photos will appear here once they are confirmed." />

  return (
    <div className="photo-browser">
      <aside className="photo-categories" aria-label="Photo categories">
        <p>Categories</p>
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}<span>{item === ALL ? photos.length : photos.filter((photo) => photo.category === item).length}</span>
          </button>
        ))}
      </aside>
      <div className="photo-stage">
        <figure>
          <img src={active.src} alt={active.alt ?? active.title} />
          <figcaption>
            <div><strong>{active.title}</strong><span>{active.category}</span></div>
            <p>{[active.location, active.date].filter(Boolean).join(' · ') || 'Personal photo archive'}</p>
          </figcaption>
        </figure>
        <div className="photo-thumbs" aria-label="Choose a photo">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === active.id ? 'is-active' : ''}
              aria-label={`View ${item.title}`}
              aria-pressed={item.id === active.id}
              onClick={() => setActiveId(item.id)}
            >
              <img src={item.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function BooksPanel() {
  if (!books.length) return <EmptyState title="The reading shelf is still being filled" description="Only books Peter has actually read will appear here." />
  return <div className="shelf-list">{books.map((item, index) => (
    <article className="shelf-item" key={item.id}>
      <div className="book-spine" style={{ '--book-index': index } as React.CSSProperties}>{item.title.slice(0, 1)}</div>
      <div><p className="item-meta">{item.status === 'reading' ? 'Reading' : 'Finished'} · {item.author}</p><h3>{item.title}</h3><p>{item.note}</p><ExternalLink href={item.url}>View book</ExternalLink></div>
    </article>
  ))}</div>
}

function MoviesPanel() {
  if (!movies.length) return <EmptyState title="Film notes are on their way" description="This opens once the real watchlist and notes are confirmed." />
  return <div className="film-list">{movies.map((item, index) => (
    <article key={item.id}>
      <div className="film-index">{String(index + 1).padStart(2, '0')}</div>
      <div><p className="item-meta">{item.year ?? 'Film note'}</p><h3>{item.title}</h3><p>{item.note}</p><ExternalLink href={item.url}>View film</ExternalLink></div>
    </article>
  ))}</div>
}

function ResearchPanel() {
  const [tab, setTab] = useState<ResearchItem['category']>('research')
  const labels: Record<ResearchItem['category'], string> = { research: 'Research', writing: 'Writing', 'in-progress': 'In progress' }
  const visible = research.filter((item) => item.category === tab)
  return <div>
    <div className="panel-tabs" role="tablist" aria-label="Research categories">{Object.entries(labels).map(([key, label]) => (
      <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key as ResearchItem['category'])}>{label}</button>
    ))}</div>
    {visible.length ? <div className="research-list">{visible.map((item) => (
      <article key={item.id}>
        <div className="research-date">{item.date ?? 'PDF'}</div>
        <div><h3>{item.title}</h3><p>{item.summary}</p><div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><ExternalLink href={item.attachment ?? item.externalUrl}>Open PDF</ExternalLink></div>
      </article>
    ))}</div> : <EmptyState title={`${labels[tab]} coming soon`} description="Published once confirmed; no placeholder copy is shown." />}
  </div>
}

function ExperiencePanel() {
  const [track, setTrack] = useState<ExperienceItem['track']>('internship')
  return <div>
    <div className="panel-tabs" role="tablist" aria-label="Experience categories">
      <button type="button" role="tab" aria-selected={track === 'internship'} onClick={() => setTrack('internship')}>Internships</button>
      <button type="button" role="tab" aria-selected={track === 'campus'} onClick={() => setTrack('campus')}>Education</button>
    </div>
    <div className="timeline">{experiences.filter((item) => item.track === track).map((item) => (
      <article key={item.id}>
        <i aria-hidden="true" />
        <p className="item-meta">{item.period}{item.location ? ` · ${item.location}` : ''}</p>
        <h3>{item.role}</h3>
        <h4>{item.organization}</h4>
        <p>{item.summary}</p>
        {item.highlights && <ul>{item.highlights.slice(0, 3).map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>}
        <ExternalLink href={item.url}>Visit organisation</ExternalLink>
      </article>
    ))}</div>
  </div>
}

function ResumePanel() {
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    fetch(resume.file, { method: 'HEAD' }).then((response) => setMissing(!response.ok)).catch(() => setMissing(true))
  }, [])
  return <div className="resume-view">
    <div className="resume-preview">
      {missing ? (
        <div className="resume-placeholder"><span>CV</span><strong>Peter Cui</strong><p>The résumé is temporarily unavailable. Please try again later.</p></div>
      ) : (
        <a href={resume.file} target="_blank" rel="noreferrer" aria-label={`Open ${resume.title}`}>
          <img src={resume.previewImage} alt={`First page of ${resume.title}`} />
        </a>
      )}
    </div>
    <div className="resume-actions"><a className="solid-link" href={resume.file} target="_blank" rel="noreferrer">View PDF online</a><a className="text-link" href={resume.file} download={resume.downloadName}>Download résumé</a></div>
  </div>
}

function PanelBody({ hotspot }: { hotspot: HotspotId }) {
  switch (hotspot) {
    case 'projects': return <ProjectsPanel />
    case 'photos': return <PhotosPanel />
    case 'books': return <BooksPanel />
    case 'movies': return <MoviesPanel />
    case 'research': return <ResearchPanel />
    case 'experience': return <ExperiencePanel />
    case 'resume': return <ResumePanel />
    case 'whiteboard': return <Whiteboard />
  }
}

export function ContentPanel({ hotspot, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const titleId = `panel-title-${hotspot}`

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.01 : 0.24 })
    gsap.fromTo(dialog.current, { opacity: 0, y: 20, scale: 0.99 }, { opacity: 1, y: 0, scale: 1, duration: reduced ? 0.01 : 0.46, ease: 'power3.out', delay: reduced ? 0 : 0.05 })
  }, { scope: root })

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    const panel = dialog.current
    const closeButton = panel?.querySelector<HTMLButtonElement>('.panel-close')
    closeButton?.focus()

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panel) return
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), canvas[tabindex]')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      returnFocus.current?.focus()
    }
  }, [])

  return (
    <div className="panel-backdrop" ref={root} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`content-panel panel-${hotspot}`} ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="panel-header">
          <div><span>{hotspotMeta[hotspot].index} / 08</span><h2 id={titleId}>{hotspotMeta[hotspot].label}</h2></div>
          <button className="panel-close" type="button" onClick={onClose} aria-label="Close panel">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg>
          </button>
        </header>
        <div className="panel-body"><PanelBody hotspot={hotspot} /></div>
        <footer className="panel-footer"><span>Peter Cui · Personal Workbench</span><button type="button" onClick={onClose}>Back to room</button></footer>
      </section>
    </div>
  )
}
