// Self-check for ISO <-> Date conversion: node scripts/check-date.ts
import assert from 'node:assert/strict'
import { dateToISO, dayLabel, isoToDate, todayISO } from '../src/lib/date.ts'

for (const iso of ['2026-01-01', '2026-02-28', '2024-02-29', '2026-12-31']) assert.equal(dateToISO(isoToDate(iso)), iso)
// Local midnight must survive (toISOString would shift it a day back east of UTC).
const d = isoToDate('2026-11-17')
assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate()], [2026, 10, 17])
assert.equal(dateToISO(new Date(2026, 10, 17, 0, 5)), '2026-11-17')
assert.equal(dateToISO(new Date(2026, 10, 17, 23, 59)), todayISO(new Date(2026, 10, 17, 23, 59)))

// dayLabel: weekday by default, dropped for tight rows; Today/Yesterday either way.
assert.equal(dayLabel('2026-11-17', '2026-11-23'), 'Tue, 17 Nov')
assert.equal(dayLabel('2026-11-17', '2026-11-23', { weekday: false }), '17 Nov')
assert.equal(dayLabel('2026-11-22', '2026-11-23', { weekday: false }), 'Yesterday')

console.log('check-date ok')
