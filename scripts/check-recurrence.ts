// Self-check for recurrence math: node scripts/check-recurrence.ts
import assert from 'node:assert/strict'
import { describeFrequency, dueIndices, nextDate, occurrenceDate, restartFloor, scheduleChanged, type RecurrenceRule } from '../src/lib/recurrence.ts'

const rule = (over: Partial<RecurrenceRule>): RecurrenceRule => ({
  freq: 'month',
  interval: 1,
  startDate: '2026-01-31',
  end: { type: 'never' },
  paused: false,
  ...over,
})
const dates = (r: RecurrenceRule, count: number) => Array.from({ length: count }, (_, n) => occurrenceDate(r, n))

// Month-end clamping, no drift (2028 is a leap year)
assert.deepEqual(dates(rule({}), 4), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
assert.equal(occurrenceDate(rule({ startDate: '2028-01-31' }), 1), '2028-02-29')
assert.equal(occurrenceDate(rule({}), 11), '2026-12-31')
assert.equal(occurrenceDate(rule({}), 12), '2027-01-31') // year rollover

// Every 3 months
assert.deepEqual(dates(rule({ interval: 3, startDate: '2026-11-15' }), 3), ['2026-11-15', '2027-02-15', '2027-05-15'])

// Yearly from Feb 29
const yearly = rule({ freq: 'year', startDate: '2028-02-29' })
assert.deepEqual(dates(yearly, 5), ['2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29'])

// Weekly and daily, across month/year boundaries
assert.deepEqual(dates(rule({ freq: 'week', startDate: '2026-12-25' }), 3), ['2026-12-25', '2027-01-01', '2027-01-08'])
assert.equal(occurrenceDate(rule({ freq: 'day', interval: 10, startDate: '2026-02-25' }), 1), '2026-03-07')

// dueIndices
const monthly = rule({ startDate: '2026-01-01' })
assert.deepEqual(dueIndices(monthly, 0, '2026-03-01'), [0, 1, 2]) // inclusive of today
assert.deepEqual(dueIndices(monthly, 2, '2026-03-01'), [2])
assert.deepEqual(dueIndices(monthly, 3, '2026-03-01'), [])
assert.deepEqual(dueIndices(monthly, 0, '2025-12-31'), []) // not started

// Ends
assert.deepEqual(dueIndices(rule({ startDate: '2026-01-01', end: { type: 'count', value: 2 } }), 0, '2030-01-01'), [0, 1])
assert.deepEqual(dueIndices(rule({ startDate: '2026-01-01', end: { type: 'date', value: '2026-03-01' } }), 0, '2030-01-01'), [0, 1, 2]) // inclusive
assert.deepEqual(dueIndices(rule({ startDate: '2026-01-01', end: { type: 'date', value: '2026-02-28' } }), 0, '2030-01-01'), [0, 1])

// Paused
assert.deepEqual(dueIndices(rule({ startDate: '2026-01-01', paused: true }), 0, '2030-01-01'), [])

// Bad interval must not hang
assert.deepEqual(dueIndices(rule({ startDate: '2026-01-01', interval: 0 }), 0, '2030-01-01'), [])

// 5-year backlog = 60 indices
const backlog = dueIndices(monthly, 0, '2030-12-01')
assert.equal(backlog.length, 60)
assert.equal(backlog[59], 59)

// nextDate
assert.equal(nextDate(monthly, 3), '2026-04-01')
assert.equal(nextDate(rule({ end: { type: 'count', value: 3 } }), 3), null)
assert.equal(nextDate(rule({ startDate: '2026-01-01', end: { type: 'date', value: '2026-03-15' } }), 3), null)

// describeFrequency / scheduleChanged
assert.equal(describeFrequency('month', 1), 'Monthly')
assert.equal(describeFrequency('day', 1), 'Daily')
assert.equal(describeFrequency('week', 2), 'Every 2 weeks')
assert.equal(scheduleChanged(monthly, { ...monthly }), false)
assert.equal(scheduleChanged(monthly, { ...monthly, interval: 2 }), true)
assert.equal(scheduleChanged(monthly, { ...monthly, startDate: '2026-01-02' }), true)
assert.equal(scheduleChanged(monthly, { ...monthly, freq: 'year' }), true)

// restartFloor: the date the next payment was due
assert.equal(restartFloor(rule({ startDate: '2026-01-17' }), 3), '2026-04-17')
assert.equal(restartFloor(rule({ startDate: '2026-01-31' }), 1), '2026-02-28') // clamped like any occurrence

console.log('check-recurrence: ok')
