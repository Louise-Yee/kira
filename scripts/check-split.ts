// Self-check for split maths: node scripts/check-split.ts
import assert from 'node:assert/strict'
import { apportion, computeShares, evenItems, exactItems, grandTotal, splitItem, type SplitItem } from '../src/lib/split.ts'

const none = { type: 'percent', value: 0 } as const

// apportion: sums exactly, leftover goes to the biggest fraction, ties to the lower index
assert.deepEqual(apportion(680, [1, 1, 1]), [227, 227, 226])
assert.deepEqual(apportion(100, [1, 1, 1]), [34, 33, 33])
assert.deepEqual(apportion(100, [0, 0]), [0, 0])
assert.deepEqual(apportion(0, [3, 4]), [0, 0])
assert.deepEqual(apportion(10, [1, 3]), [3, 7]) // 2.5 / 7.5: equal fractions, so the leftover sen goes to the lower index
assert.deepEqual(splitItem({ amount: 680, people: [0, 1, 2] }), [
  { person: 0, amount: 227 },
  { person: 1, amount: 227 },
  { person: 2, amount: 226 },
])

// grandTotal: half-up rounding, basis points, receipt total
assert.equal(grandTotal(1880, { type: 'percent', value: 1600 }), 2181) // 2180.8
assert.equal(grandTotal(1000, { type: 'percent', value: 1600 }), 1160)
assert.equal(grandTotal(5, { type: 'percent', value: 1000 }), 6) // 5.5 rounds up
assert.equal(grandTotal(1880, { type: 'total', value: 2200 }), 2200)

// A bill like the sheet: 3 people, 16% tax, a 6.80 item shared by all and a 12.00 item for person 0
const sheet = computeShares({
  people: 3,
  items: [
    { amount: 680, people: [0, 1, 2] },
    { amount: 1200, people: [0] },
  ],
  charges: { type: 'percent', value: 1600 },
})
assert.deepEqual(sheet.shares.map((s) => s.subtotal), [1427, 227, 226]) // 2.27 / 2.27 / 2.26 before tax, plus the 12.00
assert.equal(sheet.subtotal, 1880)
assert.equal(sheet.total, 2181)
assert.deepEqual(sheet.shares.map((s) => s.total), [1656, 263, 262])
assert.deepEqual(sheet.shares.map((s) => s.charge), [229, 36, 36])

// A receipt total that isn't a clean multiplier still adds up exactly
const odd = computeShares({
  people: 3,
  items: [
    { amount: 1333, people: [0, 1] },
    { amount: 777, people: [2] },
  ],
  charges: { type: 'total', value: 2501 },
})
assert.equal(odd.shares.reduce((n, s) => n + s.total, 0), 2501)

// A discount (receipt total below the subtotal): negative charges, still exact
const discount = computeShares({ people: 2, items: [{ amount: 1000, people: [0, 1] }], charges: { type: 'total', value: 900 } })
assert.deepEqual(discount.shares.map((s) => s.total), [450, 450])
assert.deepEqual(discount.shares.map((s) => s.charge), [-50, -50])

// A person with no items owes 0; an empty bill is all zeros
const lonely = computeShares({ people: 3, items: [{ amount: 500, people: [0, 1] }], charges: { type: 'percent', value: 600 } })
assert.equal(lonely.shares[2].total, 0)
assert.equal(lonely.shares[2].subtotal, 0)
assert.deepEqual(computeShares({ people: 2, items: [], charges: { type: 'total', value: 100 } }).shares.map((s) => s.total), [0, 0])

// Even and exact modes
const even = computeShares({ people: 3, items: evenItems(10000, 3), charges: none })
assert.deepEqual(even.shares.map((s) => s.total), [3334, 3333, 3333])
const exact = computeShares({ people: 3, items: exactItems([1000, 0, 250]), charges: none })
assert.deepEqual(exact.shares.map((s) => s.total), [1000, 0, 250])
assert.equal(exact.total, 1250)

// Big bills: amount x weight passes 2^53, so this needs BigInt to stay exact
const big = computeShares({ people: 3, items: [{ amount: 999999999, people: [0, 1, 2] }, { amount: 999999999, people: [0] }], charges: { type: 'percent', value: 1600 } })
assert.equal(big.shares.reduce((n, s) => n + s.total, 0), big.total)
assert.equal(big.total, grandTotal(big.subtotal, { type: 'percent', value: 1600 }))

// 200 random bills (seeded, so a failure reproduces): shares always sum exactly to the total
let seed = 12345
const rand = (n: number) => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed % n
}
for (let bill = 0; bill < 200; bill++) {
  const people = 1 + rand(6)
  const items: SplitItem[] = Array.from({ length: 1 + rand(8) }, () => {
    const who = Array.from({ length: people }, (_, i) => i).filter(() => rand(2) === 0)
    return { amount: 1 + rand(50000), people: who.length ? who : [rand(people)] }
  })
  const charges = rand(2) ? ({ type: 'percent', value: rand(3000) } as const) : ({ type: 'total', value: 1 + rand(300000) } as const)
  const r = computeShares({ people, items, charges })
  assert.equal(r.shares.reduce((n, s) => n + s.total, 0), r.total, `bill ${bill}`)
  assert.equal(r.shares.reduce((n, s) => n + s.subtotal, 0), r.subtotal, `bill ${bill} subtotal`)
  assert.equal(r.subtotal, items.reduce((n, i) => n + i.amount, 0), `bill ${bill} items`)
  for (const s of r.shares) assert.equal(s.subtotal + s.charge, s.total)
}

console.log('check-split: ok')
