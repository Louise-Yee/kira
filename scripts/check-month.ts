// Self-check for month totals and day grouping: node scripts/check-month.ts
import assert from 'node:assert/strict'
import { addDays, dayLabel, monthName } from '../src/lib/date.ts'
import { groupByDay, signed, totals } from '../src/lib/month-summary.ts'

const tx = (kind: 'expense' | 'income', amount: number, date: string, createdAt = 0) => ({ kind, amount, date, createdAt })

assert.equal(signed(tx('expense', 500, '2026-11-01')), -500)
assert.equal(signed(tx('income', 500, '2026-11-01')), 500)
assert.deepEqual(totals([]), { income: 0, expense: 0 })

const list = [
  tx('expense', 1000, '2026-11-17', 1),
  tx('income', 250000, '2026-11-17', 3),
  tx('expense', 550, '2026-11-17', 2),
  tx('expense', 99, '2026-11-03', 1),
]
assert.deepEqual(totals(list), { income: 250000, expense: 1649 })

const groups = groupByDay(list)
assert.deepEqual(groups.map((g) => g.date), ['2026-11-17', '2026-11-03'])
assert.deepEqual(groups[0].items.map((t) => t.createdAt), [3, 2, 1]) // newest first within a day
assert.equal(groups[0].net, 250000 - 1000 - 550)
assert.equal(groups[1].net, -99)
assert.deepEqual(groupByDay([]), [])

// dayLabel
assert.equal(dayLabel('2026-11-17', '2026-11-17'), 'Today')
assert.equal(dayLabel('2026-11-16', '2026-11-17'), 'Yesterday')
assert.equal(dayLabel('2026-02-28', '2026-03-01'), 'Yesterday') // month boundary
assert.equal(dayLabel('2025-12-31', '2026-01-01'), 'Yesterday') // year boundary
assert.equal(dayLabel('2026-11-10', '2026-11-17'), 'Tue, 10 Nov')
assert.equal(dayLabel('2026-11-03', '2026-11-17'), 'Tue, 3 Nov')
assert.equal(monthName('2026-11'), 'November')

console.log('check-month: ok')

// addDays
assert.equal(addDays('2026-11-17', -30), '2026-10-18')
assert.equal(addDays('2026-03-01', -1), '2026-02-28')
assert.equal(addDays('2026-12-31', 1), '2027-01-01')
