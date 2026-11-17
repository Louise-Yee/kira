// Self-check for chart maths: node scripts/check-chart-data.ts
import assert from 'node:assert/strict'
import { byCategory, monthlyTotals } from '../src/lib/chart-data.ts'

const tx = (kind: 'expense' | 'income', amount: number, categoryId: string, date = '2026-11-05') => ({ kind, amount, categoryId, date })

// byCategory: sums, sorts, ignores income
const a = byCategory([tx('expense', 300, 'food'), tx('expense', 100, 'food'), tx('expense', 100, 'bus'), tx('income', 9999, 'salary')])
assert.equal(a.total, 500)
assert.deepEqual(a.rows, [
  { categoryId: 'food', amount: 400, percent: 80 },
  { categoryId: 'bus', amount: 100, percent: 20 },
])
assert.equal(a.others, null)

// ties break by id, so the order is stable
assert.deepEqual(byCategory([tx('expense', 50, 'b'), tx('expense', 50, 'a')]).rows.map((r) => r.categoryId), ['a', 'b'])

// empty / income-only: no rows, no divide by zero
assert.deepEqual(byCategory([]), { rows: [], others: null, total: 0 })
assert.equal(byCategory([tx('income', 100, 'salary')]).rows.length, 0)

// limit folds the tail into others, and percents still add to 100
const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => tx('expense', 1000 - i * 100, id))
const m = byCategory(many)
assert.equal(m.rows.length, 6)
assert.deepEqual(m.rows.map((r) => r.categoryId), ['a', 'b', 'c', 'd', 'e', 'f'])
assert.equal(m.others?.amount, 400 + 300) // g + h
assert.equal(m.rows.reduce((n, r) => n + r.percent, 0) + (m.others?.percent ?? 0), 100)
assert.equal(byCategory(many, 8).others, null)

// rounding: three equal thirds still total 100
const thirds = byCategory([tx('expense', 1, 'a'), tx('expense', 1, 'b'), tx('expense', 1, 'c'), tx('expense', 1, 'd')], 3)
assert.equal(thirds.rows.reduce((n, r) => n + r.percent, 0) + (thirds.others?.percent ?? 0), 100)

// monthlyTotals
const yms = ['2026-09', '2026-10', '2026-11']
const t = monthlyTotals(
  [
    tx('expense', 100, 'x', '2026-09-30'),
    tx('income', 500, 's', '2026-11-01'),
    tx('expense', 50, 'x', '2026-11-30'),
    tx('expense', 999, 'x', '2026-08-31'), // before the range: ignored
    tx('expense', 999, 'x', '2026-12-01'), // after the range: ignored
  ],
  yms,
)
assert.deepEqual(t, [
  { ym: '2026-09', income: 0, expense: 100 },
  { ym: '2026-10', income: 0, expense: 0 }, // empty month still present
  { ym: '2026-11', income: 500, expense: 50 },
])

console.log('check-chart-data: ok')
