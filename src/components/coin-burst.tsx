import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { drawAscii } from '@/lib/ascii-draw'
import { COINS, isGone, spawnCoins, stepCoin } from '@/lib/coin-burst'
import { identity, rotateWorld, shadeCoin } from '@/lib/coin3d'

const FRAMES = 12 // a full turn of the coin
/** Coin sizes in css px. Each is drawn at its own size: scaling one big drawing down would shrink the letters to dust. */
const TIERS = [24, 36, 48, 56]
const GIVE_UP_MS = 4500 // never leave the overlay up longer than this
const HIDE_MS = 600 // coins stay hidden behind the button this long, then fly free

const cache = new Map<string, HTMLCanvasElement[]>()

const nearestTier = (size: number) => TIERS.reduce((best, t) => (Math.abs(t - size) < Math.abs(best - size) ? t : best))

/** The ASCII coin of one size at each step of a turn, built once: ray-marching the lit 3D coin is too heavy to run per coin per frame. */
function getSprites(tier: number, dpr: number): HTMLCanvasElement[] {
  const key = `${tier}@${dpr}`
  const hit = cache.get(key)
  if (hit) return hit
  const tilt = rotateWorld(identity(), 1, 0, 0, -0.35)
  const sprites = Array.from({ length: FRAMES }, (_, i) => {
    const m = rotateWorld(tilt, 0, 1, 0, (i / FRAMES) * Math.PI * 2)
    const cv = document.createElement('canvas')
    cv.width = cv.height = Math.round(tier * dpr)
    const g = cv.getContext('2d')
    if (g) {
      g.scale(dpr, dpr)
      // Inside the coin the brightness stays between mid cobalt and light blue: bright enough to read on a dark page, and
      // the cap keeps even the shine short of white.
      drawAscii(g, tier, tier, Math.max(4, tier / 8), 0.1, (nx, ny) => {
        const v = shadeCoin(m, nx * 1.05, ny * 1.05)
        return v < 0 ? 0 : Math.min(0.9, 0.55 + v * 0.35)
      })
    }
    return cv
  })
  cache.set(key, sprites)
  return sprites
}

/**
 * A small shower of ASCII coins that pops out from behind `from` (the button that was tapped), which stays in front
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
    const byTier = new Map(TIERS.map((t) => [t, getSprites(t, dpr)]))
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
        const tier = nearestTier(c.size)
        const sprite = byTier.get(tier)?.[Math.floor(c.phase) % FRAMES]
        if (sprite) g.drawImage(sprite, c.x - tier / 2, c.y - tier / 2, tier, tier)
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
