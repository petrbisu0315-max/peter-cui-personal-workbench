export type HotspotId =
  | 'whiteboard'
  | 'books'
  | 'movies'
  | 'photos'
  | 'projects'
  | 'research'
  | 'resume'
  | 'experience'
  | 'gallery'

export type CityPhotoItem = {
  id: string
  city: string
  title: string
  year: string
  location: string
  camera: string
  filmStyle: string
  story: string
  src: string
  aspectRatio?: string
  alt?: string
}

export type ProjectItem = {
  id: string
  title: string
  description: string
  tags: string[]
  status?: 'completed' | 'in-progress'
  period?: string
  url?: string
  repository?: string
  image?: string
}

export type PhotoItem = {
  id: string
  title: string
  category: string
  location?: string
  date?: string
  src?: string
  alt?: string
}

export type BookItem = {
  id: string
  title: string
  author?: string
  summary?: string
  sourceLabel?: 'Douban' | 'Publisher' | 'Bookseller' | 'Collection'
  status: 'reading' | 'finished'
  kind?: 'book' | 'collection' | 'periodical'
  cover?: string
  volumes?: string[]
  url?: string
}

export type MovieItem = {
  id: string
  title: string
  alternateTitle?: string
  year?: number
  kind?: 'film' | 'series' | 'stage_recording'
  status?: 'watched'
  rating?: number | null
  poster?: string
  url?: string
}

export type ResearchItem = {
  id: string
  category: 'research' | 'writing' | 'in-progress'
  title: string
  summary: string
  date?: string
  authors?: string
  journal?: string
  issue?: string
  pages?: string
  tags: string[]
  /** First page of the paper, so a reader sees the published layout. */
  thumbnail?: string
  attachment?: string
  externalUrl?: string
}

export type ExperienceItem = {
  id: string
  track: 'campus' | 'internship'
  organization: string
  role: string
  period: string
  location?: string
  summary: string
  highlights?: string[]
  url?: string
}

export type ResumeDocument = {
  title: string
  file: string
  previewImage?: string
  paperImage?: string
  updatedAt?: string
  downloadName: string
}
