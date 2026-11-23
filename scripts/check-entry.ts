// Self-check for the entry form's "what's missing" hint: node scripts/check-entry.ts
import assert from 'node:assert/strict'
import { entryProblem, type Entry } from '../src/lib/entry.ts'

const ok: Entry = { kind: 'expense', amount: 1250, currency: 'MYR', rate: null, categoryId: 'food', note: '' }
assert.equal(entryProblem(ok, null), null)
assert.equal(entryProblem({ ...ok, amount: 0 }, null), 'Enter an amount.')
// The amount comes first, before the category.
assert.equal(entryProblem({ ...ok, amount: 0, categoryId: null }, null), 'Enter an amount.')
assert.equal(entryProblem({ ...ok, categoryId: null }, null), 'Pick a category.')
// A foreign currency needs a rate (typed or fetched).
assert.equal(entryProblem({ ...ok, currency: 'SGD' }, null), 'Enter the rate for SGD.')
assert.equal(entryProblem({ ...ok, currency: 'SGD' }, 3.19), null)
console.log('entry ok')
