import type { HotspotId } from '../types/content'

export const hotspotOrder: HotspotId[] = [
  'resume',
  'experience',
  'research',
  'projects',
  'photos',
  'books',
  'movies',
  'whiteboard',
]

export const hotspotMeta: Record<HotspotId, { label: string; shortLabel: string; hoverLabel: string; index: string }> = {
  resume: { label: 'Resume', shortLabel: 'Resume', hoverLabel: 'View résumé', index: '01' },
  experience: { label: 'Internships', shortLabel: 'Intern', hoverLabel: 'Internship timeline', index: '02' },
  gallery: { label: 'City Gallery', shortLabel: 'Gallery', hoverLabel: 'City photography', index: '03' },
  projects: { label: 'Projects', shortLabel: 'Projects', hoverLabel: 'Vibecoding projects', index: '04' },
  photos: { label: 'Personal Photos', shortLabel: 'Camera', hoverLabel: 'Personal photos (placeholder)', index: '05' },
  books: { label: 'Reading Shelf', shortLabel: 'Books', hoverLabel: 'Reading shelf', index: '06' },
  movies: { label: 'Watchlist', shortLabel: 'Films', hoverLabel: 'Films & series', index: '07' },
  whiteboard: { label: 'Leave a Note', shortLabel: 'Whiteboard', hoverLabel: 'Leave a note', index: '08' },
  research: { label: 'Research & Writing', shortLabel: 'Research', hoverLabel: 'Research & writing', index: '09' },
}

export function hotspotFromObjectName(name: string): HotspotId | null {
  if (/SLOT_BlankCanvas|PROP_Canvas/i.test(name)) return 'whiteboard'
  if (/PROP_Bookcase/i.test(name)) return 'books'
  if (/Interstellar/i.test(name)) return 'movies'
  if (/PROP_Camera/i.test(name)) return 'photos'
  if (/PROP_Laptop/i.test(name)) return 'projects'
  if (/PROP_Document|DocumentClip|PROP_Pen/i.test(name)) return 'research'
  if (/SLOT_Resume/i.test(name)) return 'resume'
  if (/SLOT_IDBadge/i.test(name)) return 'experience'
  return null
}
