import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { rgb } from '@/lib/ascii-draw'
import { COINS, isGone, spawnCoins, stepCoin } from '@/lib/coin-burst'

const FRAMES = 12 // a full turn of the coin
const GRID = 12 // the coin is GRID x GRID chunky pixels
const GIVE_UP_MS = 4500 // never leave the overlay up longer than this
const HIDE_MS = 600 // coins stay hidden behind the button this long, then fly free

// Three flat tones from the app's cobalt ramp. No light source and no gradients: it is drawn, not rendered, so it reads as pixel art.
const [EDGE, BODY, SHINE] = [0.3, 0.62, 0.92].map((v) => `rgb(${rgb(v).join()})`)

let sprites: HTMLCanvasElement[] | null = null

/** The coin as a flat pixel-art sprite at each step of a turn (squashed sideways as it spins), built once. */
function getSprites(): HTMLCanvasElement[] {
  if (sprites) return sprites
  const r = GRID / 2 - 0.5
  sprites = Array.from({ length: FRAMES }, (_, i) => {
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
  return sprites
}

/**
 * A small shower of pixel-art coins that pops out from behind `from` (the button that was tapped), which stays in front
 * of them. Covers the page without taking taps, and calls `onDone` when the last coin has fallen out (or straight away
 * with reduced motion, which gets no animation).
 */
export function CoinBurst({ from, onDone }: { from: DOMRect; onDone: () => void }) {
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
    const frames = getSprites()
    g.imageSmoothingEnabled = false // hard pixel edges when the sprite is scaled up
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
        // Whole pixels only (each sprite pixel is `px` screen pixels, positions snap to them), so no coin is ever blurry.
        const px = Math.max(2, Math.round(c.size / GRID))
        const size = px * GRID
        g.drawImage(frames[Math.floor(c.phase) % FRAMES], Math.round((c.x - size / 2) / px) * px, Math.round((c.y - size / 2) / px) * px, size, size)
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
