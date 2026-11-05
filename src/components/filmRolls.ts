/** One photograph on a roll. `thumb` is what the film strip shows, `src` the full print. */
export type RollFrame = {
  id: string
  src: string
  thumb: string
  title: string
  alt: string
  place?: string
}

/** A roll of film: a set of related photographs shown as one canister on the bench. */
export type Roll = {
  id: string
  name: string
  nameCn?: string
  /** Index into LABEL_STYLES, so the canister keeps its colours between views. */
  style: number
  iso: number
  frames: RollFrame[]
}

export type LabelStyle = {
  /** Canister label background, text and accent colours. */
  paper: string
  ink: string
  accent: string
  /** Colour of the end caps. */
  cap: string
}

/** Six label looks borrowed from how film stock is packaged: cream, black, green and so on. */
export const LABEL_STYLES: LabelStyle[] = [
  { paper: '#efe3c4', ink: '#1b1713', accent: '#e8a31d', cap: '#1a1614' },
  { paper: '#1c1a1b', ink: '#f2ebdd', accent: '#d8322a', cap: '#0f0e0e' },
  { paper: '#ece6cf', ink: '#17301f', accent: '#1f6b43', cap: '#1d2a21' },
  { paper: '#171718', ink: '#f2ebdd', accent: '#f4efe6', cap: '#0e0e0f' },
  { paper: '#dfe4e2', ink: '#162235', accent: '#2f5fa8', cap: '#1a2230' },
  { paper: '#ebd8cf', ink: '#2a1626', accent: '#8f3d82', cap: '#2a1b27' },
]

const ISO_STEPS = [400, 200, 800, 100, 400, 200, 400]

/** Edge printing along the film, e.g. "SHANGHAI 400 · 03". */
export function edgeCode(roll: Roll, index: number) {
  return `${roll.name.toUpperCase()} ${roll.iso} · ${String(index + 1).padStart(2, '0')}`
}

/** The first frames' worth of text for a canister, kept in one place for 3D and 2D alike. */
export function rollCaption(roll: Roll, position: number) {
  const exposures = `${roll.frames.length} EXP`
  return {
    number: `ROLL ${String(position + 1).padStart(2, '0')}`,
    title: roll.name.toUpperCase(),
    subtitle: roll.nameCn ?? '',
    exposures,
  }
}

type CityPhotoLike = {
  id: string
  city: string
  cityCn: string
  title: string
  src: string
  thumbnail: string
  alt: string
  location: string
}

/** One roll per city, in the order the cities first appear. */
export function rollsFromCities(photos: readonly CityPhotoLike[]): Roll[] {
  const order: string[] = []
  const grouped = new Map<string, CityPhotoLike[]>()
  for (const photo of photos) {
    if (!grouped.has(photo.city)) {
      grouped.set(photo.city, [])
      order.push(photo.city)
    }
    grouped.get(photo.city)!.push(photo)
  }
  return order.map((city, index) => {
    const items = grouped.get(city)!
    return {
      id: `city-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: city,
      nameCn: items[0].cityCn,
      style: index % LABEL_STYLES.length,
      iso: ISO_STEPS[index % ISO_STEPS.length],
      frames: items.map((photo) => ({
        id: photo.id,
        src: photo.src,
        thumb: photo.thumbnail,
        title: photo.title,
        alt: photo.alt,
        place: photo.location,
      })),
    }
  })
}

type PersonalPhotoLike = {
  id: string
  title: string
  category: string
  location?: string
  src?: string
  alt?: string
}

const CATEGORY_CN: Record<string, string> = {
  'At work': '工作',
  'Everyday life': '日常',
  Internships: '实习',
}

/** One roll per category of personal photograph; photographs without a file are left out. */
export function rollsFromPersonal(photos: readonly PersonalPhotoLike[]): Roll[] {
  const order: string[] = []
  const grouped = new Map<string, PersonalPhotoLike[]>()
  for (const photo of photos) {
    if (!photo.src) continue
    if (!grouped.has(photo.category)) {
      grouped.set(photo.category, [])
      order.push(photo.category)
    }
    grouped.get(photo.category)!.push(photo)
  }
  return order.map((category, index) => ({
    id: `personal-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: category,
    nameCn: CATEGORY_CN[category],
    style: (index + 2) % LABEL_STYLES.length,
    iso: ISO_STEPS[(index + 1) % ISO_STEPS.length],
    frames: grouped.get(category)!.map((photo) => ({
      id: photo.id,
      src: photo.src!,
      thumb: photo.src!,
      title: photo.title,
      alt: photo.alt ?? photo.title,
      place: photo.location,
    })),
  }))
}

/**
 * Where canisters lie on the bench. `lean` is how far the can's long axis is turned from
 * pointing straight up the screen, so label text stays readable.
 */
export type CanPlacement = { x: number; z: number; lean: number }

function seeded(seed: number) {
  let state = (seed * 2654435761) >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

export const BENCH_SPACING = { x: 2.4, z: 3 }

export function benchLayout(count: number, columns: number): CanPlacement[] {
  const rows = Math.ceil(count / columns)
  return Array.from({ length: count }, (_, i) => {
    const random = seeded(i + 11)
    const col = i % columns
    const row = Math.floor(i / columns)
    // The last row may be short; centre it.
    const inRow = row === rows - 1 ? count - row * columns : columns
    const offset = (columns - inRow) / 2
    return {
      x: (col + offset - (columns - 1) / 2) * BENCH_SPACING.x + (random() - 0.5) * 0.5,
      z: (row - (rows - 1) / 2) * BENCH_SPACING.z + (random() - 0.5) * 0.5,
      lean: (random() - 0.5) * 1.1,
    }
  })
}

/** Number of canister columns: the bench is wider than the view and is dragged to explore. */
export function benchColumns(aspect: number, count: number) {
  const wanted = aspect >= 1.7 ? 5 : aspect >= 1.2 ? 4 : aspect >= 0.8 ? 3 : 2
  return Math.max(1, Math.min(wanted, count))
}
