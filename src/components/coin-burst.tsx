import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { drawAscii, rgb } from '@/lib/ascii-draw'
import { COINS, isGone, spawnCoins, stepCoin } from '@/lib/coin-burst'
import { identity, rotateWorld, shadeCoin } from '@/lib/coin3d'

const FRAMES = 12 // a full turn of the coin
const GRID = 12 // the pixel coin is GRID x GRID chunky pixels
const ASCII_SPRITE = 96 // css px; the ASCII coin is drawn scaled down for smaller coins

/** `pixel`: flat chunky pixels. `ascii`: the 3D coin drawn in ASCII letters. */
export type CoinStyle = 'pixel' | 'ascii'
const GIVE_UP_MS = 4500 // never leave the overlay up longer than this
const HIDE_MS = 600 // coins stay hidden behind the button this long, then fly free

// Three flat tones from the app's cobalt ramp. No light source and no gradients: it is drawn, not rendered, so it reads as pixel art.
const [EDGE, BODY, SHINE] = [0.3, 0.62, 0.92].map((v) => `rgb(${rgb(v).join()})`)

const cache: Partial<Record<CoinStyle, HTMLCanvasElement[]>> = {}

/** The ASCII coin at each step of a turn: the lit 3D coin ray-marched once into letters (too heavy to run per coin per frame). */
function asciiSprites(): HTMLCanvasElement[] {
  const tilt = rotateWorld(identity(), 1, 0, 0, -0.35)
  return Array.from({ length: FRAMES }, (_, i) => {
    const m = rotateWorld(tilt, 0, 1, 0, (i / FRAMES) * Math.PI * 2)
    const cv = document.createElement('canvas')
    cv.width = cv.height = ASCII_SPRITE * 2
    const g = cv.getContext('2d')
    if (g) {
      g.scale(2, 2)
      // A floor of brightness inside the coin keeps its silhouette solid, so small ones still read as coins. The cap keeps
      // it in the cobalt part of the palette: only the shine reaches light blue, never white.
      drawAscii(g, ASCII_SPRITE, ASCII_SPRITE, 5, 0.1, (nx, ny) => {
        const v = shadeCoin(m, nx * 1.05, ny * 1.05)
        return v < 0 ? 0 : Math.min(0.85, 0.3 + v * 0.75)
      })
    }
    return cv
  })
}

/** The coin as a flat pixel-art sprite at each step of a turn (squashed sideways as it spins). */
function pixelSprites(): HTMLCanvasElement[] {
  const r = GRID / 2 - 0.5
  return Array.from({ length: FRAMES }, (_, i) => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = GRID
    const g = cv.getContext('2d')
    if (!g) return cv
    const halfW = Math.max(0.6, Math.abs(Math.cos((i / FRAMES) * Math.PI * 2)) * r) // edge-on is a one-pixel bar
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const nx = (x + 0.5 - GRID / 2) / halfW
        const ny = (y + 0.5 - GRID / 2) / r
        const d = nx * nx + ny * ny
        if (d > 1) continue
        // Rim, a fixed shine patch at the top-left (it turns with the coin), the rest body.
        g.fillStyle = d > 0.6 ? EDGE : nx < -0.1 && ny < -0.1 && d < 0.4 ? SHINE : BODY
        g.fillRect(x, y, 1, 1)
      }
    return cv
  })
}

const getSprites = (style: CoinStyle) => (cache[style] ??= style === 'ascii' ? asciiSprites() : pixelSprites())

/**
 * A small shower of coins that pops out from behind `from` (the button that was tapped), which stays in front
 * of them. Covers the page without taking taps, and calls `onDone` when the last coin has fallen out (or straight away
 * with reduced motion, which gets no animation).
 */
export function CoinBurst({ from, style = 'pixel', onDone }: { from: DOMRect; style?: CoinStyle; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })

  useEffect(() => {
    if (reduce) {
      done.current()
      return
    }
    const cv = ref.current
    const g = cv?.getContext('2d')
    if (!cv || !g) return
    const dpr = Math.min(2, devicePixelRatio || 1)
    const w = innerWidth
    const h = innerHeight
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const frames = getSprites(style)
    g.imageSmoothingEnabled = style === 'ascii' // pixel coins keep hard edges when scaled up
    let coins = spawnCoins(COINS, from.left + from.width / 2, from.top + from.height / 2, Math.random)
    let last = performance.now()
    const started = last
    let raf = 0
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      coins = coins.map((c) => stepCoin(c, dt)).filter((c) => !isGone(c, h))
      g.clearRect(0, 0, w, h)
      g.save()
      if (now - started < HIDE_MS) {
        // Draw everywhere except over the button (even-odd: the screen rectangle minus the pill), so coins come out from behind it.
        const hole = new Path2D()
        hole.rect(0, 0, w, h)
        hole.roundRect(from.left, from.top, from.width, from.height, from.height / 2)
        g.clip(hole, 'evenodd')
      }
      for (const c of coins) {
        if (c.delay > 0) continue
        const frame = frames[Math.floor(c.phase) % FRAMES]
        if (style === 'ascii') {
          g.drawImage(frame, c.x - c.size / 2, c.y - c.size / 2, c.size, c.size)
        } else {
          // Whole pixels only (each sprite pixel is `px` screen pixels, positions snap to them), so no coin is ever blurry.
          const px = Math.max(2, Math.round(c.size / GRID))
          const size = px * GRID
          g.drawImage(frame, Math.round((c.x - size / 2) / px) * px, Math.round((c.y - size / 2) / px) * px, size, size)
        }
      }
      g.restore()
      if (coins.length && now - started < GIVE_UP_MS) raf = requestAnimationFrame(frame)
      else done.current()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one burst per mount; `from` is read once at the start
  }, [reduce])

  return createPortal(<canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />, document.body)
}
