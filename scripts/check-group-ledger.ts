// Self-check for the group expense ledger: node scripts/check-group-ledger.ts
import assert from 'node:assert/strict'
import {
  MAX_HISTORY,
  applyDelta,
  emptyTotals,
  evenShares,
  involvesOnly,
  netOf,
  nextHistory,
  settlementDelta,
  sharesProblem,
  suggestTransfers,
  totalsDelta,
  type GroupExpense,
} from '../src/lib/group-ledger.ts'

// Equal split: the leftover sen go to the first people and the parts add up
assert.deepEqual(evenShares(1000, ['a', 'b', 'c']), { a: 334, b: 333, c: 333 })
assert.deepEqual(evenShares(680, ['a', 'b', 'c']), { a: 227, b: 227, c: 226 })
assert.deepEqual(evenShares(500, ['a']), { a: 500 })

// Validation
assert.equal(sharesProblem(1000, { a: 500, b: 500 }), null)
assert.equal(sharesProblem(0, { a: 0 }), 'Enter an amount.')
assert.equal(sharesProblem(1000, {}), 'Pick who it is split between.')
assert.equal(sharesProblem(1000, { a: 400, b: 500 }), 'The shares are short of the total.')
assert.equal(sharesProblem(1000, { a: 600, b: 500 }), 'The shares add up to more than the total.')
assert.equal(sharesProblem(1000, { a: 1500, b: -500 }), 'Every share must be zero or more.')
assert.equal(sharesProblem(1000, { a: 500.5, b: 499.5 }), 'Every share must be zero or more.')

// Adding an expense: a paid 90.00 for a, b, c
const dinner = { date: '2026-11-18', amount: 9000, paidBy: 'a', shares: { a: 3000, b: 3000, c: 3000 } }
const afterDinner = applyDelta(emptyTotals(), totalsDelta(null, dinner))
assert.deepEqual(afterDinner, { spent: 9000, paid: { a: 9000 }, owed: { a: 3000, b: 3000, c: 3000 }, months: { '2026-11': 9000 }, sent: {}, received: {} })
assert.equal(netOf(afterDinner, 'a'), 6000)
assert.equal(netOf(afterDinner, 'b'), -3000)
assert.equal(netOf(afterDinner, 'zed'), 0)
// Balances always add up to zero
assert.equal(['a', 'b', 'c'].reduce((s, u) => s + netOf(afterDinner, u), 0), 0)

// Editing: b paid instead, in December, and c is dropped
const edited = { date: '2026-12-01', amount: 6000, paidBy: 'b', shares: { a: 3000, b: 3000 } }
const afterEdit = applyDelta(afterDinner, totalsDelta(dinner, edited))
assert.equal(afterEdit.spent, 6000)
assert.equal(afterEdit.paid.a, 0)
assert.equal(afterEdit.paid.b, 6000)
assert.equal(afterEdit.owed.c, 0)
assert.equal(afterEdit.months['2026-11'], 0)
assert.equal(afterEdit.months['2026-12'], 6000)
assert.equal(['a', 'b', 'c'].reduce((s, u) => s + netOf(afterEdit, u), 0), 0)

// An unchanged edit changes nothing, and deleting undoes the add
assert.deepEqual(totalsDelta(dinner, dinner), emptyTotals())
assert.deepEqual(applyDelta(afterDinner, totalsDelta(dinner, null)), { spent: 0, paid: { a: 0 }, owed: { a: 0, b: 0, c: 0 }, months: { '2026-11': 0 }, sent: {}, received: {} })

// History: newest first, capped
const expense: GroupExpense = { ...dinner, title: 'Dinner', createdBy: 'a', createdAt: 1, updatedAt: 1 }
let current = expense
for (let i = 0; i < MAX_HISTORY + 5; i++) current = { ...current, title: `v${i}`, previous: nextHistory(current, 'a', i) }
assert.equal(current.previous?.length, MAX_HISTORY)
assert.equal(current.previous?.[0].title, `v${MAX_HISTORY + 3}`)
assert.equal(nextHistory(expense, 'b', 5)[0].by, 'b')

// Settling up: b pays a back 30.00, which moves both balances and leaves the totals of spending alone
const afterPay = applyDelta(afterDinner, settlementDelta({ from: 'b', to: 'a', amount: 3000 }, 1))
assert.equal(afterPay.spent, 9000)
assert.equal(netOf(afterPay, 'a'), 3000)
assert.equal(netOf(afterPay, 'b'), 0)
assert.equal(netOf(afterPay, 'c'), -3000)
assert.equal(['a', 'b', 'c'].reduce((s, u) => s + netOf(afterPay, u), 0), 0)
// Taking it back restores the balances
const undone = applyDelta(afterPay, settlementDelta({ from: 'b', to: 'a', amount: 3000 }, -1))
assert.equal(netOf(undone, 'a'), 6000)
assert.equal(netOf(undone, 'b'), -3000)
// An old group with no sent/received still works
assert.equal(netOf({ paid: { a: 10 }, owed: { a: 4 } }, 'a'), 6)

// Suggested payments: biggest debtor pays biggest creditor, and everyone ends at zero
assert.deepEqual(suggestTransfers({ a: 6000, b: -3000, c: -3000 }), [{ from: 'b', to: 'a', amount: 3000 }, { from: 'c', to: 'a', amount: 3000 }])
assert.deepEqual(suggestTransfers({ a: 5000, b: 1000, c: -2000, d: -4000 }), [
  { from: 'd', to: 'a', amount: 4000 },
  { from: 'c', to: 'a', amount: 1000 },
  { from: 'c', to: 'b', amount: 1000 },
])
assert.deepEqual(suggestTransfers({ a: 0, b: 0 }), [])
const mixed = { a: 7000, b: -2500, c: -4500, d: 1500, e: -1500, f: 0 }
const settled = { ...mixed }
for (const t of suggestTransfers(mixed)) {
  settled[t.from] += t.amount
  settled[t.to] -= t.amount
}
assert.ok(Object.values(settled).every((v) => v === 0), 'paying the suggestions settles everyone')
assert.ok(suggestTransfers(mixed).length <= 5, 'at most people - 1 payments')
// The same balances in a different key order give the same answer
assert.deepEqual(suggestTransfers({ c: -2000, a: 1000, b: 1000 }), suggestTransfers({ b: 1000, c: -2000, a: 1000 }))

// Leavers
assert.equal(involvesOnly(dinner, ['a', 'b', 'c']), true)
assert.equal(involvesOnly(dinner, ['a', 'b']), false)
console.log('check-group-ledger: ok')
