// Self-check for receipt content: node scripts/check-receipt.ts
import assert from 'node:assert/strict'
import { buildReceipt } from '../src/lib/receipt-data.ts'
import { computeShares } from '../src/lib/split.ts'

// The same bill as check-split: 6.80 shared by three, 12.00 for me alone, 16% tax
const items = [
  { name: 'Nasi lemak', amount: 680, people: [0, 1, 2] },
  { amount: 1200, people: [0] },
]
const charges = { type: 'percent', value: 1600 } as const
const split = {
  title: 'Dinner',
  date: '2026-11-17',
  mode: 'itemized' as const,
  people: ['Me', 'Aiman', 'Bee'],
  items,
  charges,
  shares: computeShares({ people: 3, items, charges }).shares,
}

const all = buildReceipt(split)
assert.equal(all.everyone, true)
assert.equal(all.total, 2181)
assert.equal(all.chargeLabel, 'Tax & service 16%')
assert.deepEqual(all.people.map((p) => p.total), [1656, 263, 262])
assert.deepEqual(all.people[0].rows, [
  { label: 'Nasi lemak ÷3', amount: 227 },
  { label: 'Item 2', amount: 1200 },
])
assert.deepEqual(all.people[2].rows, [{ label: 'Nasi lemak ÷3', amount: 226 }])
for (const p of all.people) assert.equal(p.subtotal + p.charge, p.total)

// One person's receipt shows only their own rows, and their total is the receipt total
const aiman = buildReceipt(split, 1)
assert.equal(aiman.everyone, false)
assert.deepEqual(aiman.people.map((p) => p.name), ['Aiman'])
assert.equal(aiman.total, 263)
assert.equal(JSON.stringify(aiman).includes('Item 2'), false) // my 12.00 item is not leaked

// No charge: no label. A receipt total: a plain label. Fractional percent.
const none = buildReceipt({ ...split, charges: { type: 'percent', value: 0 }, shares: computeShares({ people: 3, items, charges: { type: 'percent', value: 0 } }).shares })
assert.equal(none.chargeLabel, '')
assert.equal(buildReceipt({ ...split, charges: { type: 'total', value: 2200 } }).chargeLabel, 'Tax & service')
assert.equal(buildReceipt({ ...split, charges: { type: 'percent', value: 650 } }).chargeLabel, 'Tax & service 6.5%')

// Even and exact modes get plain row labels, and exact never shows a charge
const evenItems = [{ amount: 3000, people: [0, 1, 2] }]
const even = buildReceipt({ ...split, mode: 'even', items: evenItems, charges: { type: 'percent', value: 0 }, shares: computeShares({ people: 3, items: evenItems, charges: { type: 'percent', value: 0 } }).shares })
assert.deepEqual(even.people[0].rows, [{ label: 'Shared equally', amount: 1000 }])
const exactItems = [{ amount: 500, people: [1] }]
const exact = buildReceipt({ ...split, mode: 'exact', items: exactItems, charges: { type: 'percent', value: 1600 }, shares: computeShares({ people: 3, items: exactItems, charges: { type: 'percent', value: 0 } }).shares })
assert.equal(exact.chargeLabel, '')
assert.deepEqual(exact.people[1].rows, [{ label: 'Amount', amount: 500 }])
assert.deepEqual(exact.people[0].rows, []) // someone with nothing to pay still appears, with no rows

console.log('check-receipt: ok')
