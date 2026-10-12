/**
 * Warms the 3D room while the visitor is still reading the intro paper.
 *
 * The room chunk and its models are only needed after "Enter workbench", but fetching
 * them at that moment is what made entering feel slow: the visitor waits for both the
 * chunk and the model before anything appears. Importing the chunk here starts those
 * downloads during the intro instead, and the later lazy import resolves from cache.
 */

/** Room model and interaction props together, kept in step with what RoomScene loads. */
export const ROOM_MODEL_BYTES = 2_700_000
/** Long enough not to compete with the first paint, short enough to finish during the intro. */
export const WARM_DELAY_MS = 400

type Connection = { saveData?: boolean; effectiveType?: string }

/** Skips the download on a metered or very slow connection, where it would cost more than it saves. */
function connectionAllowsPrefetch() {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as Navigator & { connection?: Connection }).connection
  if (!connection) return true
  if (connection.saveData) return false
  return !/^(slow-)?2g$/.test(connection.effectiveType ?? '')
}

export function warmRoom(load: () => Promise<unknown>) {
  if (!connectionAllowsPrefetch()) return () => undefined

  // An explicit timer beats waiting for idle, so the download is well under way by the
  // time a visitor finishes reading the intro.
  const timer = setTimeout(() => {
    void load().catch(() => {
      // A failed warm-up is invisible: the real import retries when the visitor enters.
    })
  }, WARM_DELAY_MS)
  return () => clearTimeout(timer)
}
