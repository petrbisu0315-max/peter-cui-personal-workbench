import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'peter-workbench:whiteboard:v1'
const COLORS = ['#161616', '#bd6545', '#244c6a', '#6e7653', '#f0ede7']
const HANDWRITING = 'Caveat, "Bradley Hand", "Segoe Print", cursive'

export function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const history = useRef<string[]>([])
  const [color, setColor] = useState(COLORS[0])
  const [message, setMessage] = useState('')
  const [canUndo, setCanUndo] = useState(false)

  const getContext = () => canvasRef.current?.getContext('2d') ?? null

  useEffect(() => {
    void document.fonts?.load(`600 38px ${HANDWRITING}`)
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.fillStyle = '#f5f2eb'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const image = new Image()
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height)
      image.src = saved
    }
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width),
      y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height),
    }
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = canvas.toDataURL('image/png')
    localStorage.setItem(STORAGE_KEY, data)
  }

  const remember = () => {
    const current = canvasRef.current?.toDataURL('image/png')
    if (!current) return
    history.current.push(current)
    if (history.current.length > 16) history.current.shift()
    setCanUndo(true)
  }

  const restore = (data?: string | null) => {
    const canvas = canvasRef.current
    const context = getContext()
    if (!canvas || !context) return
    context.fillStyle = '#f5f2eb'
    context.fillRect(0, 0, canvas.width, canvas.height)
    if (!data) return
    const image = new Image()
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.src = data
  }

  const clear = () => {
    remember()
    localStorage.removeItem(STORAGE_KEY)
    restore(null)
  }

  const undo = () => {
    const previous = history.current.pop()
    if (previous) {
      restore(previous)
      localStorage.setItem(STORAGE_KEY, previous)
    }
    setCanUndo(history.current.length > 0)
  }

  const stampMessage = () => {
    const context = getContext()
    if (!context || !message.trim()) return
    remember()
    context.fillStyle = color
    context.font = `600 38px ${HANDWRITING}`
    const words = message.trim().split(/\s+/)
    let line = ''
    let y = 74
    words.forEach((word) => {
      const test = `${line}${word} `
      if (context.measureText(test).width > 720 && line) {
        context.fillText(line, 56, y)
        line = `${word} `
        y += 48
      } else line = test
    })
    context.fillText(line, 56, y)
    setMessage('')
    save()
  }

  return (
    <div className="whiteboard-tool">
      <div className="whiteboard-controls">
        <div className="color-list" aria-label="Pen colour">
          {COLORS.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={`Use colour ${item}`}
              className={color === item ? 'is-active' : ''}
              style={{ background: item }}
              onClick={() => setColor(item)}
            />
          ))}
        </div>
        <div className="board-actions">
          <button type="button" onClick={undo} disabled={!canUndo}>Undo</button>
          <button type="button" onClick={clear}>Clear</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={540}
        aria-label="Drawing canvas"
        onPointerDown={(event) => {
          const context = getContext()
          if (!context) return
          remember()
          drawing.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          const p = point(event)
          context.beginPath()
          context.moveTo(p.x, p.y)
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return
          const context = getContext()
          if (!context) return
          const p = point(event)
          context.strokeStyle = color
          context.lineWidth = 5
          context.lineTo(p.x, p.y)
          context.stroke()
        }}
        onPointerUp={() => { drawing.current = false; save() }}
        onPointerCancel={() => { drawing.current = false }}
      />
      <div className="message-stamp">
        <input
          value={message}
          maxLength={120}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') stampMessage() }}
          placeholder="You can write down anything you want"
        />
        <button type="button" onClick={stampMessage} disabled={!message.trim()}>Add to board</button>
      </div>
      <p>Notes are saved only in this browser, on this device.</p>
    </div>
  )
}
