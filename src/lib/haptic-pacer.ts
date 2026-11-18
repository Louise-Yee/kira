export type Tick = 'light' | 'medium' | 'heavy'

const QUARTER_TURN = Math.PI / 2 // one tick per quarter turn of the coin
const MIN_SPEED = 0.8 // rad/s; below this it's a crawl, stay quiet
const MIN_GAP_MS = 40 // never buzz faster than this
export const MAX_TICKS = 24 // per gesture, so a fling can't buzz forever

/** Faster spin → firmer tick. */
export function tickStyle(speed: number): Tick {
  return speed < 6 ? 'light' : speed < 14 ? 'medium' : 'heavy'
}

/** Turns coin rotation into haptic ticks, capped per gesture. Pure: the caller fires the haptic. */
export function createPacer() {
  let acc = 0
  let last = -Infinity
  let count = 0
  return {
    /** angle: radians turned since last call; speed: current rad/s. Returns a tick to fire, or null. */
    feed(angle: number, speed: number, now: number): Tick | null {
      acc += angle
      if (acc < QUARTER_TURN) return null
      acc %= QUARTER_TURN
      if (speed < MIN_SPEED || now - last < MIN_GAP_MS || count >= MAX_TICKS) return null
      last = now
      count++
      return tickStyle(speed)
    },
    /** New gesture (pointer down, tap): refill the budget. */
    reset() {
      acc = 0
      count = 0
    },
  }
}
