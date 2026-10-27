import type { ProjectItem } from '../types/content'

/** The display is painted at the size the interactive DOM layer is laid out at, so both match. */
export const SCREEN_PX = { width: 1280, height: 821 } as const

export const SCREEN_FONTS = [
  '700 15px Manrope',
  '500 15px Manrope',
  '400 46px "Libre Caslon Display"',
  '500 14px "DM Mono"',
]

const SANS = 'Manrope, "PingFang SC", "Microsoft YaHei", sans-serif'
const SERIF = '"Libre Caslon Display", serif'
const MONO = '"DM Mono", monospace'
const INK = '#f4f0e8'
const CORAL = '#e07a5f'

const isCjk = (char: string) => /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char)

/** Splits text into lines no wider than `maxWidth`: per word for Latin, per character for CJK. */
export function wrapText(measure: (text: string) => number, text: string, maxWidth: number, maxLines: number): string[] {
  const tokens = text.match(/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]|[^\s\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]+|\s+/g) ?? []
  const lines: string[] = []
  let line = ''
  let index = 0
  for (; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token.trim() && !line) continue
    const next = line + token
    if (line && measure(next.trimEnd()) > maxWidth) {
      lines.push(line.trimEnd())
      line = token.trim() ? token : ''
      if (lines.length === maxLines) break
    } else {
      line = next
    }
  }
  if (lines.length < maxLines) {
    if (line.trim()) lines.push(line.trimEnd())
    return lines
  }
  // Out of lines with text left over: end the last line with an ellipsis that still fits.
  let last = lines[maxLines - 1]
  while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1)
  const lastToken = last[last.length - 1]
  lines[maxLines - 1] = `${isCjk(lastToken) ? last : last.trimEnd()}…`
  return lines.slice(0, maxLines)
}

export const formatClock = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function setFont(ctx: CanvasRenderingContext2D, font: string, spacing = '0px') {
  ctx.font = font
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing
}

/** Draws `text` with its line box starting at `top`, like a CSS line of height `lineHeight`. */
function line(ctx: CanvasRenderingContext2D, text: string, x: number, top: number, lineHeight: number, align: CanvasTextAlign = 'left') {
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, top + lineHeight / 2)
}

function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
}

/** The projects home screen, laid out to the pixel like the DOM `Desktop` it stands in for. */
export function drawScreen(
  ctx: CanvasRenderingContext2D,
  projects: readonly ProjectItem[],
  images: readonly (HTMLImageElement | null)[],
  now: Date,
) {
  const { width: W, height: H } = SCREEN_PX
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#050506'
  ctx.fillRect(0, 0, W, H)

  // Desktop wallpaper: two warm washes over charcoal.
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 10)
  ctx.clip()
  ctx.fillStyle = '#141516'
  ctx.fillRect(0, 0, W, H)
  const wash = (cx: number, cy: number, rx: number, ry: number, color: string, stop: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, ry / rx)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * stop)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'))
    ctx.fillStyle = gradient
    ctx.fillRect(-W * 2, (-H * 2 * rx) / ry, W * 4, (H * 4 * rx) / ry)
    ctx.restore()
  }
  wash(W * 0.85, 0, W * 1.2, H * 0.9, 'rgba(224,122,95,0.32)', 0.55)
  wash(0, H, W * 0.9, H * 0.8, 'rgba(120,98,70,0.35)', 0.6)

  // Menu bar.
  ctx.fillStyle = 'rgba(10,10,11,0.55)'
  ctx.fillRect(0, 0, W, 40)
  ctx.fillStyle = 'rgba(244,240,232,0.08)'
  ctx.fillRect(0, 39, W, 1)
  setFont(ctx, `700 15px ${SANS}`)
  ctx.fillStyle = CORAL
  line(ctx, '●', 18, 12, 15)
  const dot = ctx.measureText('● ').width
  ctx.fillStyle = INK
  line(ctx, 'Peter OS', 18 + dot, 12, 15)
  setFont(ctx, `500 15px ${SANS}`)
  ctx.fillStyle = 'rgba(244,240,232,0.82)'
  line(ctx, 'Projects', 115.8, 12, 15)
  line(ctx, formatClock(now), 1173.6, 12, 15)
  ctx.fillStyle = 'rgba(244,240,232,0.12)'
  ctx.beginPath()
  ctx.arc(1248, 19.5, 14, 0, Math.PI * 2)
  ctx.fill()
  // Drawn as strokes: the ✕ glyph is missing from some system fonts.
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(1244, 15.5)
  ctx.lineTo(1252, 23.5)
  ctx.moveTo(1252, 15.5)
  ctx.lineTo(1244, 23.5)
  ctx.stroke()

  // Heading.
  setFont(ctx, `500 14px ${MONO}`, '0.84px')
  ctx.fillStyle = CORAL
  line(ctx, `VIBE CODING · ${projects.length} LIVE SITES`, 44, 195.8, 16.8)
  setFont(ctx, `400 46px ${SERIF}`, '-0.46px')
  ctx.fillStyle = INK
  line(ctx, 'Things I built by talking to AI', 44, 222.6, 48.3)
  setFont(ctx, `500 18px ${SANS}`)
  ctx.fillStyle = 'rgba(244,240,232,0.68)'
  const sub = wrapText(
    (text) => ctx.measureText(text).width,
    'Each one started as a conversation and shipped as a real website. Pick one to look closer.',
    720,
    2,
  )
  sub.forEach((text, i) => line(ctx, text, 44, 278.9 + i * 27, 27))

  // Cards.
  const CARD_Y = 366.9
  const CARD_H = 288.3
  const CARD_W = 224
  projects.slice(0, 5).forEach((item, index) => {
    const x = 44 + index * 242
    ctx.fillStyle = 'rgba(24,26,27,0.82)'
    roundRect(ctx, x, CARD_Y, CARD_W, CARD_H, 14)
    ctx.fill()
    ctx.strokeStyle = 'rgba(244,240,232,0.1)'
    ctx.lineWidth = 1
    roundRect(ctx, x + 0.5, CARD_Y + 0.5, CARD_W - 1, CARD_H - 1, 14)
    ctx.stroke()

    const tx = x + 11
    const tw = 202
    ctx.save()
    roundRect(ctx, tx, 377.9, tw, 126.3, 8)
    ctx.clip()
    ctx.fillStyle = '#0b0b0c'
    ctx.fillRect(tx, 377.9, tw, 126.3)
    const image = images[index]
    if (image) cover(ctx, image, tx, 377.9, tw, 126.3)
    ctx.restore()

    setFont(ctx, `500 13px ${MONO}`)
    ctx.fillStyle = 'rgba(244,240,232,0.45)'
    line(ctx, String(index + 1).padStart(2, '0'), tx, 516.2, 13)

    const measure = (text: string) => ctx.measureText(text).width
    setFont(ctx, `700 19px ${SANS}`)
    ctx.fillStyle = INK
    const title = wrapText(measure, item.title, tw, 2)
    title.forEach((text, i) => line(ctx, text, tx, 537.2 + i * 23.75, 23.75))
    setFont(ctx, `500 15px ${SANS}`)
    ctx.fillStyle = 'rgba(244,240,232,0.66)'
    const tagline = wrapText(measure, item.tagline ?? '', tw, 3)
    const top = 537.2 + title.length * 23.75 + 8
    tagline.forEach((text, i) => line(ctx, text, tx, top + i * 21.75, 21.75))
  })

  ctx.restore()
  ctx.restore()
}
