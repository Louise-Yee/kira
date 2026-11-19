// Physics for the coin shower on joining a group. Plain .ts with no imports (Node-runnable for the self-check).

export type Coin = {
  x: number
  y: number
  vx: number
  vy: number
  /** Drawn size in px. */
  size: number
  /** Spin frame, fractional; the drawer takes it modulo the frame count. */
  phase: number
  /** Frames per second. */
  spin: number
  /** Seconds until it launches (staggers the burst). */
  delay: number
}

export const COINS = 36
export const MIN_SIZE = 24
export const MAX_SIZE = 56
const STAGGER = 0.25 // seconds the launches are spread over

/**
 * Coins fired up and out from (ox, oy). Most are small and a few big; big ones fall faster, like they are nearer.
 * `rand` returns 0..1 (Math.random in the app, a fixed sequence in the check).
 */
export function spawnCoins(count: number, ox: number, oy: number, rand: () => number): Coin[] {
  return Array.from({ length: count }, () => {
    const size = MIN_SIZE + rand() ** 2 * (MAX_SIZE - MIN_SIZE)
    const angle = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 0.7
    const speed = 450 + rand() * 450
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      phase: rand() * 12,
      spin: 10 + rand() * 20,
      delay: rand() * STAGGER,
    }
  })
}

/** Gravity in px/s²: bigger (nearer) coins fall faster. */
export const gravity = (size: number) => 1400 + 900 * (size / MAX_SIZE)

/** Advance one coin by dt seconds. */
export function stepCoin(c: Coin, dt: number): Coin {
  if (c.delay > 0) return { ...c, delay: c.delay - dt }
  const drag = Math.max(0, 1 - 0.6 * dt)
  const vy = c.vy + gravity(c.size) * dt
  return { ...c, vx: c.vx * drag, vy, x: c.x + c.vx * dt, y: c.y + vy * dt, phase: c.phase + c.spin * dt }
}

/** Past the bottom edge and still falling: it can never come back. */
export const isGone = (c: Coin, height: number) => c.delay <= 0 && c.vy > 0 && c.y > height + c.size
