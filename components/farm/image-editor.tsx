'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Brush, Hand, Minus, Plus, RotateCcw, RotateCw, SlidersHorizontal, Sparkles, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Point = { x: number; y: number }
type Stroke = { points: Point[]; size: number }
type Tool = 'move' | 'mark'
type Panel = 'adjust' | 'filters' | 'mark'

const CANVAS_SIZE = 900

const PRESETS = [
  { id: 'original', label: 'Original', b: 100, c: 100, s: 100 },
  { id: 'enhance', label: 'Enhance', b: 105, c: 120, s: 125 },
  { id: 'spots', label: 'Spot boost', b: 100, c: 140, s: 170 },
  { id: 'veins', label: 'Vein detail', b: 110, c: 160, s: 40 },
  { id: 'shade', label: 'Shade fix', b: 135, c: 110, s: 110 },
] as const

export type EditorResult = { dataUrl: string; markedPercent: number }

export function ImageEditor({
  src,
  onCancel,
  onDone,
}: {
  src: string
  onCancel: () => void
  onDone: (r: EditorResult) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [preset, setPreset] = useState<string>('original')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [brushSize, setBrushSize] = useState(28)
  const [tool, setTool] = useState<Tool>('move')
  const [panel, setPanel] = useState<Panel>('adjust')
  const drag = useRef<{ mode: Tool; last: Point } | null>(null)

  useEffect(() => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => setImg(image)
    image.src = src
  }, [src])

  const baseScale = img ? Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height) : 1
  const scale = baseScale * zoom

  const applyTransform = useCallback(
    (ctx: CanvasRenderingContext2D, image: HTMLImageElement) => {
      ctx.translate(CANVAS_SIZE / 2 + offset.x, CANVAS_SIZE / 2 + offset.y)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(scale, scale)
      ctx.translate(-image.width / 2, -image.height / 2)
    },
    [offset, rotation, scale],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !img) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#1d2b22'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.save()
    applyTransform(ctx, img)
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    ctx.drawImage(img, 0, 0)
    ctx.filter = 'none'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.55)'
    for (const s of strokes) {
      ctx.lineWidth = s.size / scale
      ctx.beginPath()
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.01, s.points[0].y)
      ctx.stroke()
    }
    ctx.restore()
  }, [img, applyTransform, brightness, contrast, saturation, strokes, scale])

  useEffect(() => {
    draw()
  }, [draw])

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    }
  }

  const toImage = (p: Point): Point => {
    if (!img) return p
    const dx = p.x - CANVAS_SIZE / 2 - offset.x
    const dy = p.y - CANVAS_SIZE / 2 - offset.y
    const r = (-rotation * Math.PI) / 180
    const rx = dx * Math.cos(r) - dy * Math.sin(r)
    const ry = dx * Math.sin(r) + dy * Math.cos(r)
    return { x: rx / scale + img.width / 2, y: ry / scale + img.height / 2 }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toCanvas(e)
    drag.current = { mode: tool, last: p }
    if (tool === 'mark') setStrokes((prev) => [...prev, { points: [toImage(p)], size: brushSize }])
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return
    const p = toCanvas(e)
    if (drag.current.mode === 'move') {
      const dx = p.x - drag.current.last.x
      const dy = p.y - drag.current.last.y
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }))
    } else {
      const ip = toImage(p)
      setStrokes((prev) => {
        const copy = prev.slice()
        const last = copy[copy.length - 1]
        copy[copy.length - 1] = { ...last, points: [...last.points, ip] }
        return copy
      })
    }
    drag.current.last = p
  }

  const onPointerUp = () => {
    drag.current = null
  }

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)))
  }

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    setPreset(id)
    setBrightness(p.b)
    setContrast(p.c)
    setSaturation(p.s)
  }

  const reset = () => {
    setRotation(0)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    applyPreset('original')
    setStrokes([])
  }

  const finish = () => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const mask = document.createElement('canvas')
    const M = 120
    mask.width = M
    mask.height = M
    const mctx = mask.getContext('2d')
    let markedPercent = 0
    if (mctx) {
      const f = M / CANVAS_SIZE
      mctx.scale(f, f)
      mctx.translate(CANVAS_SIZE / 2 + offset.x, CANVAS_SIZE / 2 + offset.y)
      mctx.rotate((rotation * Math.PI) / 180)
      mctx.scale(scale, scale)
      mctx.translate(-img.width / 2, -img.height / 2)
      mctx.strokeStyle = '#000'
      mctx.lineCap = 'round'
      mctx.lineJoin = 'round'
      for (const s of strokes) {
        mctx.lineWidth = s.size / scale
        mctx.beginPath()
        s.points.forEach((p, i) => (i === 0 ? mctx.moveTo(p.x, p.y) : mctx.lineTo(p.x, p.y)))
        if (s.points.length === 1) mctx.lineTo(s.points[0].x + 0.01, s.points[0].y)
        mctx.stroke()
      }
      const data = mctx.getImageData(0, 0, M, M).data
      let filled = 0
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) filled++
      markedPercent = Math.round((filled / (M * M)) * 100)
    }
    onDone({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), markedPercent })
  }

  const iconBtn = 'flex size-10 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground disabled:opacity-40'

  return (
    <div className="flex min-h-full flex-col bg-foreground text-primary-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onCancel} className={iconBtn} aria-label="Cancel editing">
          <X className="size-5" />
        </button>
        <p className="font-semibold">Edit leaf photo</p>
        <button type="button" onClick={finish} disabled={!img} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50">
          Use photo
        </button>
      </div>

      <div className="relative px-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          className={cn('aspect-square w-full touch-none rounded-2xl', tool === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair')}
          aria-label="Leaf photo canvas. Drag to move, or switch to mark mode to highlight affected areas."
        />
        <div className="pointer-events-none absolute inset-4 rounded-2xl ring-1 ring-inset ring-primary-foreground/30">
          <div className="absolute inset-x-0 top-1/3 border-t border-primary-foreground/15" />
          <div className="absolute inset-x-0 top-2/3 border-t border-primary-foreground/15" />
          <div className="absolute inset-y-0 left-1/3 border-l border-primary-foreground/15" />
          <div className="absolute inset-y-0 left-2/3 border-l border-primary-foreground/15" />
        </div>
        {!img && <p className="absolute inset-0 flex items-center justify-center text-sm opacity-70">Loading photo…</p>}
      </div>

      <div className="flex items-center justify-center gap-2 px-4 py-3">
        <div className="flex rounded-full bg-primary-foreground/10 p-1" role="radiogroup" aria-label="Canvas tool">
          {(
            [
              { id: 'move', icon: Hand, label: 'Move' },
              { id: 'mark', icon: Brush, label: 'Mark' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={tool === id}
              onClick={() => {
                setTool(id)
                if (id === 'mark') setPanel('mark')
              }}
              className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold', tool === id && 'bg-primary-foreground text-foreground')}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setRotation((r) => r - 90)} className={iconBtn} aria-label="Rotate left">
          <RotateCcw className="size-4" />
        </button>
        <button type="button" onClick={() => setRotation((r) => r + 90)} className={iconBtn} aria-label="Rotate right">
          <RotateCw className="size-4" />
        </button>
        <button type="button" onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length} className={iconBtn} aria-label="Undo last mark">
          <Undo2 className="size-4" />
        </button>
      </div>

      <div className="mt-auto rounded-t-3xl bg-card px-5 pb-6 pt-4 text-foreground">
        <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist">
          {(
            [
              { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
              { id: 'filters', label: 'Filters', icon: Sparkles },
              { id: 'mark', label: 'Mark area', icon: Brush },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panel === id}
              onClick={() => setPanel(id)}
              className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold', panel === id ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-36" role="tabpanel">
          {panel === 'adjust' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="w-20 text-sm font-semibold">Zoom</span>
                <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="flex size-8 items-center justify-center rounded-full bg-muted" aria-label="Zoom out">
                  <Minus className="size-4" />
                </button>
                <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" aria-label="Zoom" />
                <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="flex size-8 items-center justify-center rounded-full bg-muted" aria-label="Zoom in">
                  <Plus className="size-4" />
                </button>
              </div>
              {(
                [
                  ['Brightness', brightness, setBrightness],
                  ['Contrast', contrast, setContrast],
                  ['Saturation', saturation, setSaturation],
                ] as const
              ).map(([label, value, set]) => (
                <label key={label} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-semibold">{label}</span>
                  <input
                    type="range"
                    min={label === 'Saturation' ? 0 : 50}
                    max={200}
                    value={value}
                    onChange={(e) => {
                      set(Number(e.target.value))
                      setPreset('custom')
                    }}
                    className="flex-1 accent-[var(--primary)]"
                  />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{value}%</span>
                </label>
              ))}
            </div>
          )}

          {panel === 'filters' && (
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" onClick={() => applyPreset(p.id)} aria-pressed={preset === p.id} className="flex shrink-0 flex-col items-center gap-1.5">
                  <span
                    className={cn('size-20 overflow-hidden rounded-xl border-2', preset === p.id ? 'border-primary' : 'border-transparent')}
                    style={{ filter: `brightness(${p.b}%) contrast(${p.c}%) saturate(${p.s}%)` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src || '/placeholder.svg'} alt="" className="size-full object-cover" />
                  </span>
                  <span className="text-xs font-semibold">{p.label}</span>
                </button>
              ))}
            </div>
          )}

          {panel === 'mark' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground text-pretty">
                Switch to <strong className="text-foreground">Mark</strong> and paint over spots, burns or damaged areas. This focuses the AI on the problem zone.
              </p>
              <label className="flex items-center gap-3">
                <span className="w-20 text-sm font-semibold">Brush</span>
                <input type="range" min={8} max={80} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" />
                <span className="flex size-10 items-center justify-center">
                  <span className="rounded-full bg-warning/60" style={{ width: brushSize / 2.5, height: brushSize / 2.5 }} />
                </span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTool('mark')} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                  Start marking
                </button>
                <button type="button" onClick={() => setStrokes([])} disabled={!strokes.length} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold disabled:opacity-50">
                  Clear marks ({strokes.length})
                </button>
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={reset} className="mt-2 text-sm font-semibold text-muted-foreground underline underline-offset-4">
          Reset all edits
        </button>
      </div>
    </div>
  )
}
