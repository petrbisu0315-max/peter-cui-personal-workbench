import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { warmRoom } from './warmRoom'

type Conn = { saveData?: boolean; effectiveType?: string }

function setConnection(conn: Conn | undefined) {
  Object.defineProperty(navigator, 'connection', { value: conn, configurable: true })
}

describe('room warm-up', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    setConnection(undefined)
  })

  it('starts the room download while the intro is still on screen', () => {
    setConnection(undefined)
    const load = vi.fn(() => Promise.resolve())
    warmRoom(load)
    expect(load).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(load).toHaveBeenCalledOnce()
  })

  it('cancels a warm-up that is no longer wanted', () => {
    setConnection(undefined)
    const load = vi.fn(() => Promise.resolve())
    const cancel = warmRoom(load)
    cancel()
    vi.advanceTimersByTime(5000)
    expect(load).not.toHaveBeenCalled()
  })

  it('does not spend a metered or 2G connection on a warm-up', () => {
    const load = vi.fn(() => Promise.resolve())
    setConnection({ saveData: true })
    warmRoom(load)
    vi.advanceTimersByTime(5000)
    expect(load).not.toHaveBeenCalled()

    setConnection({ effectiveType: '2g' })
    warmRoom(load)
    vi.advanceTimersByTime(5000)
    expect(load).not.toHaveBeenCalled()

    setConnection({ saveData: false, effectiveType: '4g' })
    warmRoom(load)
    vi.advanceTimersByTime(5000)
    expect(load).toHaveBeenCalledOnce()
  })

  it('never surfaces a failed warm-up, because entering retries it', async () => {
    setConnection(undefined)
    const load = vi.fn(() => Promise.reject(new Error('offline')))
    warmRoom(load)
    vi.advanceTimersByTime(400)
    await Promise.resolve()
    expect(load).toHaveBeenCalledOnce()
  })
})
