export type HotspotId =
  | 'whiteboard'
  | 'books'
  | 'movies'
  | 'photos'
  | 'projects'
  | 'research'
  | 'resume'
  | 'experience'

export type ProjectItem = {
  id: string
  title: string
  description: string
  tags: string[]
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
  author: string
  status: 'reading' | 'finished'
  note?: string
  url?: string
}

export type MovieItem = {
  id: string
  title: string
  year?: number
  note?: string
  url?: string
}

export type ResearchItem = {
  id: string
  category: 'research' | 'writing' | 'in-progress'
  title: string
  summary: string
  date?: string
  tags: string[]
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
  updatedAt?: string
  downloadName: string
}
