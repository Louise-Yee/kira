import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import type { Field } from '@/lib/coin'
import { drawAscii } from '@/lib/ascii-draw'
import { haloField, identity, orthonormalize, rotateWorld, shadeCoin } from '@/lib/coin3d'

/** Draw one frame: sample(nx, ny) in -1..1 → brightness → glyph. */
function paint(cv: HTMLCanvasElement, g: CanvasRenderingContext2D, cell: number, floor: number, sample: (nx: number, ny: number) => number, ink?: string) {
  const dpr = devicePixelRatio || 1
  const w = cv.clientWidth
  const h = cv.clientHeight
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, w, h)
  drawAscii(g, w, h, cell, floor, sample, ink)
}

/** Static ASCII texture from a 2D field. */
export function Ascii({ field, cell = 6.5, floor = 0.08, className }: { field: Field; cell?: number; floor?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const g = cv?.getContext('2d')
    if (cv && g) paint(cv, g, cell, floor, (x, y) => field(x, y, 0))
  }, [field, cell, floor])
  return <canvas ref={ref} aria-hidden className={className} />
}

const AUTO_SPIN = 0.5 // rad/s idle spin around the vertical axis
const TAP_PX = 6
const TAP_MS = 300

/** Interactive 3D ASCII coin: drag to spin (with inertia), tap to flip. */
export function AsciiCoin({ className, cell = 6.5, ink }: { className?: string; cell?: number; ink?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const cv = ref.current
    const g = cv?.getContext('2d')
    if (!cv || !g) return
    const auto = reduce ? 0 : AUTO_SPIN
    let m = rotateWorld(identity(), 1, 0, 0, -0.35) // slight tilt so it reads as 3D at rest
    let wx = 0 // angular velocity around world X / Y, rad/s
    let wy = auto
    let flip = 0, flipTarget = 0, flipV = 0
    let drag: { x: number; y: number; t: number; x0: number; y0: number; t0: number } | null = null
    let raf = 0
    let last = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!drag) {
        const decay = Math.exp(-dt * 2.5) // inertia, easing back to the idle spin
        wx *= decay
        wy = auto + (wy - auto) * decay
        m = rotateWorld(m, 0, 1, 0, wy * dt)
        m = rotateWorld(m, 1, 0, 0, wx * dt)
      }
      // underdamped spring (ζ≈0.46) → the flip overshoots and settles with a bounce
      flipV += (120 * (flipTarget - flip) - 10 * flipV) * dt
      const step = flipV * dt
      flip += step
      m = orthonormalize(rotateWorld(m, 0, 1, 0, step))

      const t = reduce ? 0 : now / 1000
      paint(cv, g, cell, 0.08, (nx, ny) => {
        const sx = nx * 1.05, sy = ny * 1.05
        const v = shadeCoin(m, sx, sy)
        return v >= 0 ? v : haloField(sx, sy, t)
      }, ink ? 'currentColor' : undefined)

      const moving = drag || Math.abs(wx) > 0.005 || Math.abs(wy) > 0.005 || Math.abs(flipTarget - flip) > 0.001 || Math.abs(flipV) > 0.01
      raf = moving ? requestAnimationFrame(frame) : 0
    }
    const wake = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const down = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId)
      const now = performance.now()
      drag = { x: e.clientX, y: e.clientY, t: now, x0: e.clientX, y0: e.clientY, t0: now }
      wx = wy = 0
      wake()
    }
    const move = (e: PointerEvent) => {
      if (!drag) return
      const now = performance.now()
      const k = Math.PI / cv.clientWidth // full-width drag = half a turn
      const yaw = -(e.clientX - drag.x) * k
      const pitch = (e.clientY - drag.y) * k
      m = rotateWorld(rotateWorld(m, 0, 1, 0, yaw), 1, 0, 0, pitch)
      const dt = Math.max(1, now - drag.t) / 1000
      wy = 0.7 * (yaw / dt) + 0.3 * wy
      wx = 0.7 * (pitch / dt) + 0.3 * wx
      drag = { ...drag, x: e.clientX, y: e.clientY, t: now }
    }
    const up = () => {
      if (!drag) return
      const now = performance.now()
      const tap = Math.hypot(drag.x - drag.x0, drag.y - drag.y0) < TAP_PX && now - drag.t0 < TAP_MS
      if (tap) flipTarget += Math.PI
      else if (now - drag.t > 80) wx = wy = 0 // held still before release: no fling
      drag = null
      wake()
    }

    cv.addEventListener('pointerdown', down)
    cv.addEventListener('pointermove', move)
    cv.addEventListener('pointerup', up)
    cv.addEventListener('pointercancel', up)
    wake()
    return () => {
      cancelAnimationFrame(raf)
      cv.removeEventListener('pointerdown', down)
      cv.removeEventListener('pointermove', move)
      cv.removeEventListener('pointerup', up)
      cv.removeEventListener('pointercancel', up)
    }
  }, [reduce, cell, ink])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Coin. Drag to spin, tap to flip."
      className={`cursor-grab touch-none active:cursor-grabbing ${className ?? ''}`}
    />
  )
}
