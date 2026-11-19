// Self-check for the coin shower physics: node scripts/check-coin-burst.ts
import assert from 'node:assert/strict'
import { COINS, MAX_SIZE, MIN_SIZE, isGone, spawnCoins, stepCoin } from '../src/lib/coin-burst.ts'

let seed = 1
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const coins = spawnCoins(COINS, 200, 600, rand)
assert.equal(coins.length, COINS)
for (const c of coins) {
  assert.ok(c.size >= MIN_SIZE && c.size <= MAX_SIZE)
  assert.ok(c.vy < 0, 'every coin launches upward')
  assert.ok(c.delay >= 0 && c.delay <= 0.25)
}
assert.ok(coins.filter((c) => c.size < 30).length > coins.length / 2, 'most coins are small')

// A coin waits for its delay, then rises, peaks and falls out of the screen
let c = { ...coins[0], delay: 0.1 }
c = stepCoin(c, 0.05)
assert.equal(c.y, 600, 'still waiting')
let top = c.y
for (let i = 0; i < 600 && !isGone(c, 800); i++) {
  c = stepCoin(c, 1 / 60)
  top = Math.min(top, c.y)
}
assert.ok(top < 600, 'it rose first')
assert.ok(isGone(c, 800), 'it left the screen')
assert.equal(isGone({ ...c, y: 100, vy: 5 }, 800), false)
assert.equal(isGone({ ...c, delay: 0.1 }, 800), false)
console.log('check-coin-burst: ok')
