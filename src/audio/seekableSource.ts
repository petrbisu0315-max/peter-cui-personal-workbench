export type SeekableSource = { url: string; release: () => void }
export type SeekableSourceLoader = (url: string, signal: AbortSignal) => Promise<SeekableSource>

// Static CDNs may ignore Range. Reuse their cached full response only when seeking needs it.
export const loadSeekableSource: SeekableSourceLoader = async (url, signal) => {
  const response = await fetch(url, { signal, cache: 'force-cache' })
  if (!response.ok) throw new Error('Audio download failed')
  const limit = 8 * 1024 * 1024
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Audio exceeds buffer limit')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Audio response is empty')
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new Error('Audio exceeds buffer limit')
      }
      chunks.push(new Uint8Array(value))
    }
  } finally {
    reader.releaseLock()
  }
  if (!size) throw new Error('Audio response is empty')
  const objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'audio/mpeg' }))
  return { url: objectUrl, release: () => URL.revokeObjectURL(objectUrl) }
}
