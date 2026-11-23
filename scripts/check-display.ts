// Self-check for display-currency maths: node scripts/check-display.ts
import assert from 'node:assert/strict'
import { rateOn, shownIn } from '../src/lib/display.ts'
import { convert } from '../src/lib/money.ts'

const series = { '2026-11-03': 0.31, '2026-11-06': 0.32, '2026-10-30': 0.3 }

// rateOn: the latest on or before the date (weekends use Friday's), else the earliest known
assert.equal(rateOn(series, '2026-11-03'), 0.31)
assert.equal(rateOn(series, '2026-11-08'), 0.32) // Sunday -> Friday
assert.equal(rateOn(series, '2026-11-01'), 0.3)
assert.equal(rateOn(series, '2026-01-01'), 0.3) // before everything: earliest
assert.equal(rateOn({}, '2026-11-03'), null)

// convert between any two currencies, integer, half up, signs kept
assert.equal(convert(10000, 'MYR', 'SGD', 0.31), 3100) // RM 100 -> S$31.00
assert.equal(convert(5000, 'MYR', 'JPY', 38.57), 1929) // RM 50 -> ¥1,928.5 -> ¥1,929
assert.equal(convert(-10000, 'MYR', 'SGD', 0.31), -3100)

// shownIn
const rm = { amount: 10000, date: '2026-11-03' }
const paidSgd = { amount: 7980, original: { currency: 'SGD', amount: 2500, rate: 3.192 }, date: '2026-11-08' }
const paidJpy = { amount: 7777, original: { currency: 'JPY', amount: 3000, rate: 0.025923 }, date: '2026-11-08' }

const sgd = shownIn('SGD', series)
assert.equal(sgd.currency, 'SGD')
assert.equal(sgd.amountOf(rm), 3100) // RM at that day's rate
assert.equal(sgd.amountOf(paidSgd), 2500) // paid in SGD: exact, no round trip
assert.equal(sgd.amountOf(paidJpy), 2489) // other currencies go through their RM amount: 77.77 * 0.32 = 24.8864

// RM display, or no rates at all (offline, nothing cached): RM amounts as stored
for (const v of [shownIn('MYR', series), shownIn('SGD', {})]) {
  assert.equal(v.currency, 'MYR')
  assert.equal(v.amountOf(paidSgd), 7980)
}

console.log('check-display: ok')
