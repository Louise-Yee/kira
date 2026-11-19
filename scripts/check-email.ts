// Self-check for email normalising: node scripts/check-email.ts
import assert from 'node:assert/strict'
import { normalizeEmail } from '../src/lib/email.ts'

assert.equal(normalizeEmail('  Ali@Example.COM '), 'ali@example.com')
assert.equal(normalizeEmail('a@b.co'), 'a@b.co')
assert.equal(normalizeEmail('no-at-sign'), null)
assert.equal(normalizeEmail('a/b@c.com'), null)
assert.equal(normalizeEmail(''), null)
assert.equal(normalizeEmail(null), null)
assert.equal(normalizeEmail(undefined), null)
console.log('check-email: ok')
