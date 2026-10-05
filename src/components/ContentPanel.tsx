import { useEffect, useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import projectsData from '../data/projects.json'
import photosData from '../data/photos.json'
import cityGalleryData from '../data/cityGallery.json'
import researchData from '../data/research.json'
import experiencesData from '../data/experiences.json'
import resumeData from '../data/resume.json'
import type {
  ExperienceItem,
  HotspotId,
  PhotoItem,
  ProjectItem,
  ResearchItem,
  ResumeDocument,
} from '../types/content'
import { hotspotMeta } from '../experience/hotspots'
import { Whiteboard } from './Whiteboard'
import { CatalogPanel } from './CatalogPanel'

type Props = { hotspot: HotspotId; onClose: () => void }

interface ExtendedExperienceItem extends ExperienceItem {
  companyCn?: string
  product?: string
  roleCn?: string
  metrics?: { label: string; val: string }[]
}

interface CityPhoto {
  id: string
  city: string
  cityCn: string
  title: string
  year: string
  location: string
  camera: string
  filmStyle: string
  gradient: string
  story: string
}

const projects = projectsData as ProjectItem[]
const personalPhotos = photosData as PhotoItem[]
const cityPhotos = cityGalleryData as CityPhoto[]
const research = researchData as ResearchItem[]
const experiences = experiencesData as ExtendedExperienceItem[]
const resume = resumeData as ResumeDocument

function ExternalLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return null
  return (
    <a className="text-link" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span>COMING SOON</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

/** 1. RESUME PANEL: Direct clean presentation with high-res preview and PDF view toggle */
function ResumePanel() {
  const [viewMode, setViewMode] = useState<'preview' | 'pdf'>('preview')
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    fetch(resume.file, { method: 'HEAD' })
      .then((res) => setMissing(!res.ok))
      .catch(() => setMissing(true))
  }, [])

  return (
    <div className="resume-container">
      {/* Top summary bio chips */}
      <div className="resume-bio-banner">
        <div className="bio-name-tag">
          <h3>崔宇杰 · Peter Cui</h3>
          <p>中共党员 · 2027 届硕士研究生 · AI 产品运营 / 商业化策略</p>
        </div>
        <div className="bio-tags">
          <span className="bio-chip">🎓 上海社会科学院 新闻研究所 · 硕士 (Top 10%)</span>
          <span className="bio-chip">🏫 北京第二外国语学院 · 捷克语学士 (Top 5%)</span>
          <span className="bio-chip">🇨🇿 捷克查理大学 交换生 (1等)</span>
          <span className="bio-chip">🌐 英语专业四级/八级 · 捷克语熟练</span>
          <span className="bio-chip">💼 6 段头部互联网与知名媒体实习经历</span>
        </div>
      </div>

      {/* View Switcher and Download Controls */}
      <div className="resume-toolbar">
        <div className="view-switch-tabs" role="tablist">
          <button
            type="button"
            className={viewMode === 'preview' ? 'is-active' : ''}
            onClick={() => setViewMode('preview')}
          >
            📄 高清视觉预览 (High-Res Sheet)
          </button>
          <button
            type="button"
            className={viewMode === 'pdf' ? 'is-active' : ''}
            onClick={() => setViewMode('pdf')}
          >
            📑 嵌入 PDF 阅读器 (Interactive PDF)
          </button>
        </div>
        <div className="resume-download-group">
          <a
            className="resume-primary-btn"
            href={resume.file}
            download={resume.downloadName}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            下载简历 PDF
          </a>
          <a
            className="resume-ghost-btn"
            href={resume.file}
            target="_blank"
            rel="noreferrer"
          >
            全屏新窗口打开 ↗
          </a>
        </div>
      </div>

      {/* Main Resume Presentation */}
      <div className="resume-sheet-frame">
        {viewMode === 'preview' ? (
          <div className="resume-visual-sheet">
            {missing ? (
              <div className="resume-placeholder">
                <span>CV</span>
                <strong>Peter Cui</strong>
                <p>The résumé file is temporarily unavailable. Please download the PDF directly.</p>
              </div>
            ) : (
              <a
                href={resume.file}
                target="_blank"
                rel="noreferrer"
                className="resume-preview-link"
                title="点击在独立窗口查看原件 PDF"
              >
                <img
                  src={resume.previewImage ?? '/images/ui/resume-preview-real-20260930.png'}
                  alt="崔宇杰个人简历完整视觉预览"
                  className="resume-preview-img"
                />
              </a>
            )}
          </div>
        ) : (
          <div className="resume-pdf-embed-wrapper">
            <iframe
              src={`${resume.file}#toolbar=1&navpanes=0`}
              title="Peter Cui Résumé PDF Document"
              className="resume-pdf-iframe"
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** 2. INTERNSHIPS PANEL: Dedicated 6-company interactive experience */
function InternshipsPanel() {
  const [activeCompanyId, setActiveCompanyId] = useState<string>('internship-convergeai')
  const [track, setTrack] = useState<'internship' | 'campus'>('internship')

  const internshipList = useMemo(
    () => experiences.filter((item) => item.track === 'internship'),
    []
  )
  const campusList = useMemo(
    () => experiences.filter((item) => item.track === 'campus'),
    []
  )

  const activeItem = useMemo(
    () => experiences.find((item) => item.id === activeCompanyId) ?? internshipList[0],
    [activeCompanyId, internshipList]
  )

  return (
    <div className="intern-container">
      {/* Top track switcher */}
      <div className="intern-track-tabs">
        <button
          type="button"
          className={track === 'internship' ? 'is-active' : ''}
          onClick={() => {
            setTrack('internship')
            setActiveCompanyId(internshipList[0]?.id ?? '')
          }}
        >
          💼 核心企业与知名媒体实习 (6 段关键经历)
        </button>
        <button
          type="button"
          className={track === 'campus' ? 'is-active' : ''}
          onClick={() => {
            setTrack('campus')
            setActiveCompanyId(campusList[0]?.id ?? '')
          }}
        >
          🎓 教育学术背景 (高校与海外交换)
        </button>
      </div>

      <div className="intern-main-grid">
        {/* Left Column: Company / Institution Navigator */}
        <aside className="intern-nav-sidebar" aria-label="Company Selection">
          {(track === 'internship' ? internshipList : campusList).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`intern-nav-item ${item.id === activeItem?.id ? 'is-active' : ''}`}
              onClick={() => setActiveCompanyId(item.id)}
            >
              <div className="nav-item-header">
                <strong>{item.organization}</strong>
                <span className="nav-item-period">{item.period.split('—')[0]}</span>
              </div>
              <div className="nav-item-sub">
                <span>{item.role}</span>
                {item.product && <small>· {item.product}</small>}
              </div>
            </button>
          ))}
        </aside>

        {/* Right Column: In-depth Detail Card */}
        {activeItem && (
          <main className="intern-detail-card" key={activeItem.id}>
            <header className="detail-card-header">
              <div className="detail-title-group">
                <span className="detail-badge">{activeItem.companyCn ?? activeItem.organization}</span>
                <h2>{activeItem.role}</h2>
                <div className="detail-meta-line">
                  <span className="meta-period">📅 {activeItem.period}</span>
                  {activeItem.location && <span className="meta-loc">📍 {activeItem.location}</span>}
                  {activeItem.product && <span className="meta-product">🚀 {activeItem.product}</span>}
                </div>
              </div>
            </header>

            {/* Metric Highlights */}
            {activeItem.metrics && activeItem.metrics.length > 0 && (
              <div className="detail-metrics-row">
                {activeItem.metrics.map((m, idx) => (
                  <div className="metric-box" key={idx}>
                    <strong>{m.val}</strong>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Scope Summary */}
            <div className="detail-summary-block">
              <p>{activeItem.summary}</p>
            </div>

            {/* Deep Breakdown Bullets */}
            {activeItem.highlights && activeItem.highlights.length > 0 && (
              <div className="detail-bullets-block">
                <h4>工作职责与业务突破 (Key Milestones & Breakthroughs)</h4>
                <ul>
                  {activeItem.highlights.map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  )
}

/** 3. CITY GALLERY PANEL: City photography with city switcher & lightbox */
function CityGalleryPanel() {
  const cities = useMemo(() => ['All Cities', 'Shanghai', 'Beijing', 'Prague', 'Hong Kong'], [])
  const [selectedCity, setSelectedCity] = useState('All Cities')
  const [lightboxPhoto, setLightboxPhoto] = useState<CityPhoto | null>(null)

  const filtered = useMemo(() => {
    if (selectedCity === 'All Cities') return cityPhotos
    return cityPhotos.filter((p) => p.city === selectedCity)
  }, [selectedCity])

  return (
    <div className="gallery-container">
      {/* City Switcher */}
      <div className="gallery-city-tabs" role="tablist">
        {cities.map((city) => (
          <button
            key={city}
            type="button"
            className={selectedCity === city ? 'is-active' : ''}
            onClick={() => setSelectedCity(city)}
          >
            {city === 'All Cities' && '🌍 All Cities (全部城市)'}
            {city === 'Shanghai' && '🏙️ Shanghai (上海)'}
            {city === 'Beijing' && '🏛️ Beijing (北京)'}
            {city === 'Prague' && '🏰 Prague (布拉格)'}
            {city === 'Hong Kong' && '⛵ Hong Kong & Travel (香港与旅途)'}
          </button>
        ))}
      </div>

      <div className="gallery-meta-note">
        <p>Photographs captured across living and travel chapters — shot on Leica, Sony and Ricoh with natural film tones.</p>
      </div>

      {/* Grid of City Photography */}
      <div className="gallery-grid">
        {filtered.map((photo) => (
          <article
            className="gallery-card"
            key={photo.id}
            onClick={() => setLightboxPhoto(photo)}
          >
            <div className="gallery-photo-frame" style={{ background: photo.gradient }}>
              <div className="photo-inner-art">
                <span className="photo-film-badge">{photo.filmStyle}</span>
                <span className="photo-city-tag">{photo.city}</span>
                <div className="photo-title-overlay">
                  <h4>{photo.title}</h4>
                  <small>{photo.location}</small>
                </div>
              </div>
            </div>
            <div className="gallery-card-caption">
              <strong>{photo.title}</strong>
              <div className="caption-sub">
                <span>📷 {photo.camera}</span>
                <span>· {photo.year}</span>
              </div>
              <p className="caption-story">{photo.story}</p>
            </div>
          </article>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="gallery-lightbox-overlay"
          onClick={() => setLightboxPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setLightboxPhoto(null)}
              aria-label="Close Lightbox"
            >
              ✕
            </button>
            <div className="lightbox-art-display" style={{ background: lightboxPhoto.gradient }}>
              <span className="lightbox-badge">{lightboxPhoto.city} · {lightboxPhoto.year}</span>
              <div className="lightbox-center-hero">
                <h3>{lightboxPhoto.title}</h3>
                <p>{lightboxPhoto.location}</p>
              </div>
            </div>
            <div className="lightbox-details-panel">
              <h3>{lightboxPhoto.title}</h3>
              <div className="lightbox-meta-grid">
                <div><span>📍 Location</span><strong>{lightboxPhoto.location}</strong></div>
                <div><span>📷 Gear</span><strong>{lightboxPhoto.camera}</strong></div>
                <div><span>🎞️ Film Tone</span><strong>{lightboxPhoto.filmStyle}</strong></div>
                <div><span>📅 Captured</span><strong>{lightboxPhoto.year}</strong></div>
              </div>
              <p className="lightbox-story-text">{lightboxPhoto.story}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 4. PERSONAL PHOTOS (Camera on Desk in 3D): Work & Life Moments */
function PersonalPhotosPanel() {
  const [activeId, setActiveId] = useState(personalPhotos[0]?.id ?? '')
  const active = personalPhotos.find((p) => p.id === activeId) ?? personalPhotos[0]

  return (
    <div className="personal-photos-container">
      <div className="personal-photos-intro">
        <div className="intro-badge">📷 个人生活与实习工作记录</div>
        <p>
          桌上相机记录的个人工作汇报、团队纪念与生活剪影。（目前作为精选占位，后续将持续更新更多生活胶片与旅途记录）
        </p>
      </div>

      <div className="personal-photos-stage">
        {active && (
          <figure className="personal-figure">
            <img src={active.src} alt={active.alt ?? active.title} className="personal-main-img" />
            <figcaption className="personal-figcaption">
              <div>
                <strong>{active.title}</strong>
                <span className="personal-cat-tag">{active.category}</span>
              </div>
              <p>{[active.location, active.date].filter(Boolean).join(' · ') || '个人影像档案'}</p>
            </figcaption>
          </figure>
        )}

        <div className="personal-thumbs-strip">
          {personalPhotos.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`personal-thumb-btn ${item.id === active?.id ? 'is-active' : ''}`}
              onClick={() => setActiveId(item.id)}
            >
              <img src={item.src} alt={item.title} loading="lazy" />
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 5. PROJECTS PANEL (Laptop on Desk in 3D) */
function ProjectsPanel() {
  return (
    <div className="project-layout">
      <p className="section-note">
        Only projects that can be verified through work, code, or process materials are listed here.
      </p>
      <div className="card-grid">
        {projects.map((item) => (
          <article className="content-card project-card" key={item.id}>
            <p className="item-meta">Completed · Independent Project</p>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="tag-row">
              {item.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <ExternalLink href={item.url ?? item.repository}>View Project</ExternalLink>
          </article>
        ))}
        <div className="project-todo">
          <span>Next Project</span>
          <p>More AI native product builds and engineering experiments in progress.</p>
        </div>
      </div>
    </div>
  )
}

/** 8. RESEARCH PANEL */
function ResearchPanel() {
  const [tab, setTab] = useState<ResearchItem['category']>('research')
  const labels: Record<ResearchItem['category'], string> = {
    research: 'Research Papers',
    writing: 'Essays & Writing',
    'in-progress': 'In Progress',
  }
  const visible = research.filter((item) => item.category === tab)

  return (
    <div>
      <div className="panel-tabs" role="tablist" aria-label="Research categories">
        {Object.entries(labels).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key as ResearchItem['category'])}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="research-list">
          {visible.map((item) => (
            <article key={item.id}>
              <div className="research-date">{item.date ?? 'PDF'}</div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <ExternalLink href={item.attachment ?? item.externalUrl}>Open PDF</ExternalLink>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`${labels[tab]} coming soon`}
          description="Verified materials will be published soon."
        />
      )}
    </div>
  )
}

/** Modal body selector */
function PanelBody({ hotspot }: { hotspot: HotspotId }) {
  switch (hotspot) {
    case 'resume':
      return <ResumePanel />
    case 'experience':
      return <InternshipsPanel />
    case 'gallery':
      return <CityGalleryPanel />
    case 'photos':
      return <PersonalPhotosPanel />
    case 'projects':
      return <ProjectsPanel />
    case 'books':
      return <CatalogPanel type="books" />
    case 'movies':
      return <CatalogPanel type="movies" />
    case 'research':
      return <ResearchPanel />
    case 'whiteboard':
      return <Whiteboard />
  }
}

export function ContentPanel({ hotspot, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const titleId = `panel-title-${hotspot}`

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.01 : 0.24 })
      gsap.fromTo(
        dialog.current,
        { opacity: 0, y: 16, scale: 0.99 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: reduced ? 0.01 : 0.42,
          ease: 'power3.out',
          delay: reduced ? 0 : 0.04,
        }
      )
    },
    { scope: root }
  )

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    const panel = dialog.current
    const closeButton = panel?.querySelector<HTMLButtonElement>('.panel-close')
    closeButton?.focus()

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panel) return
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), canvas[tabindex]'
        ),
      ]
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
    <div
      className="panel-backdrop"
      ref={root}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`content-panel panel-${hotspot}`}
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="panel-header">
          <div>
            <span>{hotspotMeta[hotspot]?.index ?? '01'} / 08</span>
            <h2 id={titleId}>{hotspotMeta[hotspot]?.label ?? 'Details'}</h2>
          </div>
          <button
            className="panel-close"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5 5 19" />
            </svg>
          </button>
        </header>

        <div className="panel-body">
          <PanelBody hotspot={hotspot} />
        </div>

        <footer className="panel-footer">
          <span>Peter Cui · Personal Portfolio</span>
          <button type="button" onClick={onClose}>
            Back to Room
          </button>
        </footer>
      </section>
    </div>
  )
}
