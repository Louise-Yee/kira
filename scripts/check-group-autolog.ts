// Self-check for turning group expenses into my transactions: node scripts/check-group-autolog.ts
import assert from 'node:assert/strict'
import { logTxId, planSync, type LoggedExpense } from '../src/lib/group-autolog.ts'

assert.equal(logTxId('g1', 'e1'), 'g_g1_e1')

const exp = (id: string, over: Partial<LoggedExpense> = {}): LoggedExpense => ({
  id, date: '2026-11-18', title: id, shares: { me: 3000, ann: 3000 }, updatedAt: 1, ...over,
})

// First launch: every expense I'm in becomes a new transaction; one I'm not in is skipped
const first = planSync('me', [exp('a'), exp('b', { shares: { ann: 6000 } })], {}, '2026-10-01')
assert.deepEqual(first.upserts, [{ expenseId: 'a', amount: 3000, date: '2026-11-18', title: 'a', isNew: true }])
assert.deepEqual(first.removals, [])
assert.deepEqual(first.next, { a: { date: '2026-11-18', updatedAt: 1 } })

// Nothing changed: nothing to write
const again = planSync('me', [exp('a'), exp('b', { shares: { ann: 6000 } })], first.next, '2026-10-01')
assert.deepEqual(again.upserts, [])
assert.deepEqual(again.removals, [])
assert.deepEqual(again.next, first.next)

// Edited (new amount, later updatedAt): an update, not a new one
const edited = planSync('me', [exp('a', { shares: { me: 4500, ann: 4500 }, updatedAt: 2, date: '2026-11-19' })], first.next, '2026-10-01')
assert.deepEqual(edited.upserts, [{ expenseId: 'a', amount: 4500, date: '2026-11-19', title: 'a', isNew: false }])
assert.deepEqual(edited.next, { a: { date: '2026-11-19', updatedAt: 2 } })

// Deleted (gone from the window): removed
const deleted = planSync('me', [], first.next, '2026-10-01')
assert.deepEqual(deleted.removals, ['a'])
assert.deepEqual(deleted.next, {})

// Aged out of the window (older than windowSince): left alone, and kept in the record
const aged = planSync('me', [], first.next, '2026-12-01')
assert.deepEqual(aged.removals, [])
assert.deepEqual(aged.upserts, [])
assert.deepEqual(aged.next, first.next)

// I was taken out of an expense I had logged: removed
const dropped = planSync('me', [exp('a', { shares: { ann: 6000 }, updatedAt: 2 })], first.next, '2026-10-01')
assert.deepEqual(dropped.removals, ['a'])
assert.deepEqual(dropped.next, {})
// A zero share counts as not being in it
assert.deepEqual(planSync('me', [exp('a', { shares: { me: 0, ann: 6000 } })], {}, '2026-10-01').upserts, [])

// Expenses added after the last launch are picked up next to the old ones
const grown = planSync('me', [exp('a'), exp('c', { updatedAt: 5 })], first.next, '2026-10-01')
assert.deepEqual(grown.upserts.map((u) => u.expenseId), ['c'])
assert.deepEqual(Object.keys(grown.next).sort(), ['a', 'c'])
console.log('check-group-autolog: ok')
