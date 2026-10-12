import { useEffect, useId, useRef, useState } from 'react'
import { shareTarget } from '../share'

/** The code as a PNG data URL: one artefact that is both displayed and downloadable. */
type QrArt = { png: string }

/**
 * Renders a scannable code for the deployed address.
 *
 * The encoder is imported on demand: most visitors never open this, and the QR library
 * has no business in the initial download of a site that was asked to load faster.
 */
async function buildQr(target: string): Promise<QrArt> {
  const { toDataURL } = await import('qrcode')
  // 512 px is far larger than the widest display, so the image stays crisp and easy to
  // scan. A raster code is used rather than the library's SVG because that SVG draws its
  // modules as a stroked path, which any inherited icon styling can silently erase.
  return { png: await toDataURL(target, { margin: 2, errorCorrectionLevel: 'M', width: 512 }) }
}

export function SharePanel() {
  const [open, setOpen] = useState(false)
  const [art, setArt] = useState<QrArt | null>(null)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  // Falls back to the canonical address when there is no location, which also keeps the
  // component renderable outside a browser.
  const [target] = useState(() => shareTarget(typeof window === 'undefined' ? '' : window.location.href))

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape, true)
    }
  }, [open])

  useEffect(() => {
    if (!open || art || failed) return
    let cancelled = false
    buildQr(target)
      .then((next) => { if (!cancelled) setArt(next) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [open, art, failed, target])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(target)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied; the address is on screen either way.
    }
  }

  return (
    <div className="share-panel" ref={root}>
      <button
        type="button"
        ref={trigger}
        className="share-trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? 'Close the scan code' : 'Show a code to scan this site'}
        title="扫码打开"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM20 16v4h-4M14 20h2" />
        </svg>
      </button>
      {open && (
        <div className="share-menu" id={id}>
          <div className="share-menu-heading">扫码打开这个网站</div>
          {art ? (
            <div className="share-code">
              <img src={art.png} alt={`指向 ${target} 的二维码`} width={512} height={512} />
            </div>
          ) : (
            <div className="share-code share-code-loading">
              {failed ? '二维码生成失败，请直接访问下面的地址' : '正在生成二维码…'}
            </div>
          )}
          <p className="share-url">{target}</p>
          <div className="share-actions">
            <button type="button" className="share-action" onClick={copy}>
              {copied ? '已复制' : '复制链接'}
            </button>
            {art && (
              <a className="share-action" href={art.png} download="peter-cui-workbench-qr.png">
                下载二维码
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
