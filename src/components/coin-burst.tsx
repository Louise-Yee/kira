import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { rgb } from '@/lib/ascii-draw'
import { COINS, isGone, spawnCoins, stepCoin } from '@/lib/coin-burst'
import { identity, rotateWorld, shadeCoin } from '@/lib/coin3d'

const FRAMES = 12 // a full turn of the coin
const GRID = 12 // the coin is GRID x GRID chunky pixels
const SHADES = [0.3, 0.55, 0.8, 1] // flat shades, dark to light: no gradients, so it reads as pixel art

const GIVE_UP_MS = 4500 // never leave the overlay up longer than this

let sprites: HTMLCanvasElement[] | null = null

/** The coin as a tiny pixel-art sprite at each step of a turn, built once: ray-marching is too heavy to run per coin per frame. */
function getSprites(): HTMLCanvasElement[] {
  if (sprites) return sprites
  const tilt = rotateWorld(identity(), 1, 0, 0, -0.35)
  sprites = Array.from({ length: FRAMES }, (_, i) => {
    const m = rotateWorld(tilt, 0, 1, 0, (i / FRAMES) * Math.PI * 2)
    const cv = document.createElement('canvas')
    cv.width = cv.height = GRID
    const g = cv.getContext('2d')
    if (g)
      for (let y = 0; y < GRID; y++)
        for (let x = 0; x < GRID; x++) {
          const v = shadeCoin(m, ((x + 0.5) / GRID) * 2.1 - 1.05, ((y + 0.5) / GRID) * 2.1 - 1.05)
          if (v < 0) continue
          g.fillStyle = `rgb(${rgb(SHADES[Math.min(SHADES.length - 1, Math.floor(v * 1.6 * SHADES.length))]).join()})`
          g.fillRect(x, y, 1, 1)
        }
    return cv
  })
  return sprites
}

/**
 * A shower of pixel-art coins fired up from the bottom of the screen. Covers the page without taking taps, and calls
 * `onDone` when the last coin has fallen out (or straight away with reduced motion, which gets no animation).
 */
export function CoinBurst({ onDone }: { onDone: () => void }) {
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
    let coins = spawnCoins(COINS, w / 2, h * 0.85, Math.random)
    let last = performance.now()
    const started = last
    let raf = 0
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      coins = coins.map((c) => stepCoin(c, dt)).filter((c) => !isGone(c, h))
      g.clearRect(0, 0, w, h)
      for (const c of coins) {
        if (c.delay > 0) continue
        // Whole pixels only (each sprite pixel is `px` screen pixels, positions snap to them), so no coin is ever blurry.
        const px = Math.max(2, Math.round(c.size / GRID))
        const size = px * GRID
        g.drawImage(frames[Math.floor(c.phase) % FRAMES], Math.round((c.x - size / 2) / px) * px, Math.round((c.y - size / 2) / px) * px, size, size)
      }
      if (coins.length && now - started < GIVE_UP_MS) raf = requestAnimationFrame(frame)
      else done.current()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [reduce])

  return createPortal(<canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />, document.body)
}
