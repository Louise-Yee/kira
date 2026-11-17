// Self-check for money + date helpers: node scripts/check-money.ts
import assert from 'node:assert/strict'
import { digitsToSen, formatRM, formatSen } from '../src/lib/money.ts'
import { addMonths, inTrendWindow, lastMonths, longDate, monthLabel, monthRange, monthsRange, todayISO, trendMonths } from '../src/lib/date.ts'

// digitsToSen
assert.equal(digitsToSen(''), 0)
assert.equal(digitsToSen('0007'), 7)
assert.equal(digitsToSen('123'), 123)
assert.equal(digitsToSen('RM 12.50'), 1250)
assert.equal(digitsToSen('1234567890'), 123456789) // 10th digit ignored
assert.equal(digitsToSen('0000'), 0)

// formatSen / formatRM
assert.equal(formatSen(123450), '1,234.50')
assert.equal(formatSen(0), '0.00')
assert.equal(formatRM(0), 'RM 0.00')
assert.equal(formatRM(5), 'RM 0.05')
assert.equal(formatRM(500), 'RM 5.00')
assert.equal(formatRM(123450), 'RM 1,234.50')
assert.equal(formatRM(123456789), 'RM 1,234,567.89')
assert.equal(formatRM(500, { sign: true }), '+RM 5.00')
assert.equal(formatRM(-500, { sign: true }), '−RM 5.00')
assert.equal(formatRM(-500), '−RM 5.00')
assert.equal(formatRM(0, { sign: true }), 'RM 0.00')

// dates
assert.equal(todayISO(new Date(2026, 0, 5, 1, 30)), '2026-01-05') // local, not UTC
assert.equal(todayISO(new Date(2026, 10, 17, 23, 59)), '2026-11-17')
assert.equal(addMonths('2026-11', 1), '2026-12')
assert.equal(addMonths('2026-12', 1), '2027-01')
assert.equal(addMonths('2026-01', -1), '2025-12')
assert.equal(addMonths('2026-03', -15), '2024-12')
assert.deepEqual(monthRange('2026-11'), { start: '2026-11-01', end: '2026-12-01' })
assert.deepEqual(monthRange('2026-12'), { start: '2026-12-01', end: '2027-01-01' })
assert.equal(monthLabel('2026-11'), 'November 2026')

// monthsRange / lastMonths
assert.deepEqual(monthsRange('2026-06', '2026-11'), { start: '2026-06-01', end: '2026-12-01' })
assert.deepEqual(monthsRange('2026-12', '2026-12'), { start: '2026-12-01', end: '2027-01-01' })
assert.deepEqual(lastMonths('2026-02', 4), ['2025-11', '2025-12', '2026-01', '2026-02'])

// trend window: 6 months ending now
assert.deepEqual(trendMonths('2026-02'), ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'])
assert.equal(inTrendWindow('2026-02', '2026-02'), true)
assert.equal(inTrendWindow('2025-09', '2026-02'), true)
assert.equal(inTrendWindow('2025-08', '2026-02'), false)
assert.equal(inTrendWindow('2026-03', '2026-02'), false)

assert.equal(longDate('2026-12-01'), '1 Dec 2026')
assert.equal(longDate('2027-01-09'), '9 Jan 2027')

console.log('check-money: ok')
