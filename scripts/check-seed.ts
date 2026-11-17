// Self-check for the default categories: node scripts/check-seed.ts
import assert from 'node:assert/strict'
import { categoryIcons } from '../src/lib/category-icons.ts'
import { defaultCategories } from '../src/lib/default-categories.ts'

const ids = defaultCategories.map((c) => c.id)
assert.equal(new Set(ids).size, ids.length, 'ids must be unique')
assert.ok(ids.includes('food') && ids.includes('salary') && ids.includes('other') && ids.includes('other-income'))

for (const c of defaultCategories) {
  assert.ok(c.icon in categoryIcons, `${c.id}: unknown icon ${c.icon}`)
  assert.match(c.color, /^cat-[1-8]$/, `${c.id}: bad colour token`)
  assert.equal(c.archived, false)
}

for (const kind of ['expense', 'income'] as const) {
  const orders = defaultCategories.filter((c) => c.kind === kind).map((c) => c.order)
  assert.deepEqual(orders, orders.map((_, i) => i), `${kind}: order must be 0..n-1`)
}
assert.equal(defaultCategories.filter((c) => c.kind === 'expense').length, 10)
assert.equal(defaultCategories.filter((c) => c.kind === 'income').length, 3)

console.log('check-seed: ok')
