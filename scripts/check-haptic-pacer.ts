// Self-check for coin haptic pacing: node scripts/check-haptic-pacer.ts
import assert from 'node:assert/strict'
import { createPacer, MAX_TICKS, tickStyle } from '../src/lib/haptic-pacer.ts'

assert.equal(tickStyle(2), 'light')
assert.equal(tickStyle(10), 'medium')
assert.equal(tickStyle(20), 'heavy')

// quarter turn needed before a tick; idle-slow speed stays silent
const p = createPacer()
assert.equal(p.feed(0.5, 10, 0), null)
assert.equal(p.feed(1.2, 10, 100), 'medium')
assert.equal(p.feed(2, 0.2, 200), null)

// min gap between ticks
const q = createPacer()
assert.equal(q.feed(2, 10, 1000), 'medium')
assert.equal(q.feed(2, 10, 1010), null)
assert.equal(q.feed(2, 10, 1050), 'medium')

// per-gesture cap, refilled by reset
const c = createPacer()
let fired = 0
for (let i = 0; i < 200; i++) if (c.feed(2, 20, i * 100)) fired++
assert.equal(fired, MAX_TICKS)
c.reset()
assert.equal(c.feed(2, 20, 1e6), 'heavy')

console.log('haptic-pacer ok')
