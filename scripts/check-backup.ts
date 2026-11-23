// Self-check for CSV escaping and backup validation: node scripts/check-backup.ts
import assert from 'node:assert/strict'
import { csvField, transactionsCsv, validateBackup, type Backup, type Json } from '../src/lib/backup.ts'
import { senToDecimal } from '../src/lib/money.ts'

// CSV fields (RFC 4180 + formula guard)
assert.equal(csvField('plain'), 'plain')
assert.equal(csvField('a,b'), '"a,b"')
assert.equal(csvField('say "hi"'), '"say ""hi"""')
assert.equal(csvField('two\nlines'), '"two\nlines"')
assert.equal(csvField('=SUM(A1)'), "'=SUM(A1)")
assert.equal(csvField('-5 items, ok'), `"'-5 items, ok"`)
assert.equal(senToDecimal(1250), '12.50')
assert.equal(senToDecimal(5), '0.05')
assert.equal(senToDecimal(123456789), '1234567.89')

const cat = { id: 'c1', name: 'Food, drink', kind: 'expense', color: 'cat-1', icon: 'food', order: 0, archived: false } as const
const tx = { kind: 'expense', amount: 1250, categoryId: 'c1', date: '2026-11-17', note: 'lunch "x"', createdAt: 1, updatedAt: 1 } as const
const csv = transactionsCsv(
  [
    { ...tx, id: 'b', date: '2026-11-18', categoryId: 'gone', splitId: 's1' },
    { ...tx, id: 'a' },
    { ...tx, id: 'deleted', deletedAt: 5 },
    { ...tx, id: 'c', date: '2026-11-19', amount: 7777, original: { currency: 'JPY', amount: 3000, rate: 0.025923 } },
  ],
  [cat],
)
assert.equal(
  csv,
  '﻿date,kind,amount,category,note,source,original_currency,original_amount,rate\r\n' +
    '2026-11-17,expense,12.50,"Food, drink","lunch ""x""",manual,,,\r\n' +
    '2026-11-18,expense,12.50,,"lunch ""x""",split,,,\r\n' +
    '2026-11-19,expense,77.77,"Food, drink","lunch ""x""",manual,JPY,3000,0.025923\r\n',
)

// Validator: a good file round-trips through JSON, and a transaction whose category isn't in the file is fine
const backup: Backup = {
  version: 1,
  exportedAt: 1,
  settings: { currency: 'MYR', createdAt: 1 },
  categories: [{ ...cat }],
  transactions: [
    { ...tx, id: 'a' },
    { ...tx, id: 'b', categoryId: 'not-in-file', recurringId: 'r1', occurrence: 0 },
    { ...tx, id: 'c', original: { currency: 'USD', amount: 999, rate: 4.1125 } },
  ],
  recurring: [
    {
      id: 'r1', kind: 'expense', amount: 100, categoryId: 'c1', note: '', freq: 'month', interval: 1,
      startDate: '2026-01-31', end: { type: 'count', value: 3 }, paused: false, posted: 1, createdAt: 1,
    },
    {
      id: 'r2', kind: 'expense', amount: 4108, original: { currency: 'USD', amount: 999, rate: 4.1125 }, categoryId: 'c1',
      note: '', freq: 'month', interval: 1, startDate: '2026-01-01', end: { type: 'never' }, paused: false, posted: 0, createdAt: 1,
    },
  ],
  splits: [
    {
      id: 's1', title: 'Dinner', date: '2026-11-17', mode: 'even', people: ['Me', 'Aiman'],
      items: [{ amount: 1000, people: [0, 1] }], charges: { type: 'percent', value: 0 },
      shares: [{ person: 0, subtotal: 500, charge: 0, total: 500 }, { person: 1, subtotal: 500, charge: 0, total: 500 }],
      categoryId: 'c1', expenseTxId: 's1_me', createdAt: 1, updatedAt: 1,
    },
    {
      id: 's2', title: 'Ramen', date: '2026-11-17', mode: 'even', currency: 'JPY', rate: 0.025923, people: ['Me', 'Aiman'],
      items: [{ amount: 3000, people: [0, 1] }], charges: { type: 'percent', value: 0 },
      shares: [{ person: 0, subtotal: 1500, charge: 0, total: 1500 }, { person: 1, subtotal: 1500, charge: 0, total: 1500 }],
      categoryId: 'c1', expenseTxId: 's2_me', createdAt: 1, updatedAt: 1,
    },
  ],
}
const clone = (): Json => JSON.parse(JSON.stringify(backup))
const child = (j: Json, k: string | number): Json => {
  if (Array.isArray(j) && typeof k === 'number') return j[k]
  if (j !== null && typeof j === 'object' && !Array.isArray(j) && typeof k === 'string') return j[k]
  throw new Error(`bad path at ${k}`)
}
/** A copy of the good backup with one value set (or removed, for undefined) at `path`. */
const mutated = (path: (string | number)[], value: Json | undefined): Json => {
  const root = clone()
  const parent = path.slice(0, -1).reduce(child, root)
  const last = path[path.length - 1]
  if (Array.isArray(parent) && typeof last === 'number') parent[last] = value ?? null
  else if (parent !== null && typeof parent === 'object' && !Array.isArray(parent) && typeof last === 'string') {
    if (value === undefined) delete parent[last]
    else parent[last] = value
  }
  return root
}

const good = validateBackup(clone())
assert.ok(good.ok)
assert.deepEqual(good.backup, backup)

// deletedAt survives an import, so a restored backup doesn't bring deleted items back
const withDeleted = validateBackup(mutated(['transactions', 0, 'deletedAt'], 5))
assert.ok(withDeleted.ok)
assert.equal(withDeleted.backup.transactions[0].deletedAt, 5)

// shareIds are dropped
const stripped = validateBackup(mutated(['splits', 0, 'shareIds'], { 1: 'abc' }))
assert.ok(stripped.ok)
assert.equal('shareIds' in stripped.backup.splits[0], false)

// Rejections name the document
const bad = (path: (string | number)[], value: Json | undefined, expected: RegExp) => {
  const r = validateBackup(mutated(path, value))
  assert.ok(!r.ok)
  assert.match(r.error, expected)
}
bad(['version'], 2, /version/)
bad(['transactions', 1, 'amount'], 12.5, /transactions\[1\] \(id b\): amount/)
bad(['transactions', 0, 'date'], '2026-02-30', /transactions\[0\] \(id a\): date/)
bad(['transactions', 0, 'kind'], 'transfer', /kind/)
bad(['categories', 0, 'name'], undefined, /categories\[0\] \(id c1\): name/)
bad(['transactions', 1, 'id'], 'a', /appears twice/)
bad(['transactions', 0, 'id'], 'x/y', /valid document id/)
bad(['recurring', 0, 'end'], { type: 'count', value: 0 }, /recurring\[0\] \(id r1\): value/)
bad(['splits', 0, 'shares', 0, 'total'], 'x', /splits\[0\] \(id s1\): total/)
bad(['splits'], {}, /splits must be a list/)
bad(['transactions', 2, 'original', 'currency'], 'usd', /transactions\[2\] \(id c\): currency/)
bad(['transactions', 2, 'original', 'rate'], 0, /rate must be a number above 0/)
bad(['recurring', 1, 'original', 'amount'], 9.99, /recurring\[1\] \(id r2\): amount/)
bad(['splits', 1, 'rate'], undefined, /splits\[1\] \(id s2\): rate/)
bad(['settings', 'displayCurrency'], 'sgd', /displayCurrency must be a 3-letter currency code/)

// the display currency survives a backup
const withDisplay = validateBackup(mutated(['settings', 'displayCurrency'], 'SGD'))
assert.ok(withDisplay.ok)
assert.equal(withDisplay.backup.settings?.displayCurrency, 'SGD')
assert.ok(!validateBackup('nope').ok)
assert.ok(!validateBackup([]).ok)

console.log('check-backup: all good')
