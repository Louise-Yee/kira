// Pure backup logic (CSV, file validation): no React or Firebase imports, so scripts/check-backup.ts runs under plain node.
import type { Category, Recurring, Settings, Split, Transaction, WithId } from './db/types.ts'
import type { Freq, RecurrenceEnd } from './recurrence.ts'
import type { Charge, Share, SplitItem, SplitMode } from './split.ts'
import { senToDecimal } from './money.ts'

export type Backup = {
  version: 1
  /** Epoch ms. */
  exportedAt: number
  settings: Settings | null
  categories: WithId<Category>[]
  transactions: WithId<Transaction>[]
  recurring: WithId<Recurring>[]
  splits: WithId<Split>[]
}

/** What `JSON.parse` can produce. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

// ---------- CSV ----------

const BOM = '﻿'

/**
 * One RFC 4180 field. Text starting with = + - @ would run as a formula in Excel, so it gets a leading
 * apostrophe (the CSV is for reading; the JSON backup is the one to restore from).
 */
export function csvField(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** Transactions as CSV (UTF-8 BOM so Excel reads it correctly), oldest first. */
export function transactionsCsv(transactions: readonly Transaction[], categories: readonly WithId<Category>[]): string {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const rows = transactions
    .toSorted((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((t) =>
      [
        t.date,
        t.kind,
        senToDecimal(t.amount),
        names.get(t.categoryId) ?? '',
        t.note,
        t.recurringId ? 'recurring' : t.splitId ? 'split' : t.groupId ? 'group' : 'manual',
      ]
        .map(csvField)
        .join(','),
    )
  return `${BOM}${['date,kind,amount,category,note,source', ...rows].join('\r\n')}\r\n`
}

// ---------- Validation ----------

class Invalid extends Error {}
type Rec = { [key: string]: Json }

const fail = (msg: string): never => {
  throw new Invalid(msg)
}
const rec = (v: Json | undefined, what: string): Rec =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v : fail(`${what} must be an object`)
const list = (v: Json | undefined, what: string): Json[] => (Array.isArray(v) ? v : fail(`${what} must be a list`))
const str = (o: Rec, k: string): string => {
  const v = o[k]
  return typeof v === 'string' ? v : fail(`${k} must be text`)
}
const int = (o: Rec, k: string, min = 0): number => {
  const v = o[k]
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= min ? v : fail(`${k} must be a whole number of ${min} or more`)
}
const anyInt = (o: Rec, k: string): number => {
  const v = o[k]
  return typeof v === 'number' && Number.isSafeInteger(v) ? v : fail(`${k} must be a whole number`)
}
const bool = (o: Rec, k: string): boolean => {
  const v = o[k]
  return typeof v === 'boolean' ? v : fail(`${k} must be true or false`)
}
const oneOf = <T extends string>(o: Rec, k: string, allowed: readonly T[]): T => {
  const v = str(o, k)
  return allowed.find((a) => a === v) ?? fail(`${k} must be one of ${allowed.join(', ')}`)
}
const date = (o: Rec, k: string): string => {
  const v = str(o, k)
  const [y, m, d] = v.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
    ? v
    : fail(`${k} must be a date (YYYY-MM-DD)`)
}
const has = (o: Rec, k: string) => o[k] !== undefined

const KINDS = ['expense', 'income'] as const

function parseCategory(o: Rec): Category {
  return {
    name: str(o, 'name'),
    kind: oneOf(o, 'kind', KINDS),
    color: str(o, 'color'),
    icon: str(o, 'icon'),
    order: anyInt(o, 'order'),
    archived: bool(o, 'archived'),
  }
}

// Optional fields are left out when absent: Firestore rejects undefined.
function parseTransaction(o: Rec): Transaction {
  return {
    kind: oneOf(o, 'kind', KINDS),
    amount: int(o, 'amount'),
    categoryId: str(o, 'categoryId'),
    date: date(o, 'date'),
    note: str(o, 'note'),
    ...(has(o, 'recurringId') ? { recurringId: str(o, 'recurringId') } : {}),
    ...(has(o, 'occurrence') ? { occurrence: int(o, 'occurrence') } : {}),
    ...(has(o, 'splitId') ? { splitId: str(o, 'splitId') } : {}),
    ...(has(o, 'groupId') ? { groupId: str(o, 'groupId') } : {}),
    ...(has(o, 'groupExpenseId') ? { groupExpenseId: str(o, 'groupExpenseId') } : {}),
    createdAt: int(o, 'createdAt'),
    updatedAt: int(o, 'updatedAt'),
  }
}

function parseEnd(v: Json | undefined): RecurrenceEnd {
  const o = rec(v, 'end')
  const type = oneOf(o, 'type', ['never', 'date', 'count'] as const)
  if (type === 'date') return { type, value: date(o, 'value') }
  if (type === 'count') return { type, value: int(o, 'value', 1) }
  return { type }
}

function parseRecurring(o: Rec): Recurring {
  return {
    kind: oneOf(o, 'kind', KINDS),
    amount: int(o, 'amount'),
    categoryId: str(o, 'categoryId'),
    note: str(o, 'note'),
    freq: oneOf<Freq>(o, 'freq', ['day', 'week', 'month', 'year']),
    interval: int(o, 'interval', 1),
    startDate: date(o, 'startDate'),
    end: parseEnd(o.end),
    paused: bool(o, 'paused'),
    posted: int(o, 'posted'),
    createdAt: int(o, 'createdAt'),
  }
}

function parseItem(v: Json): SplitItem {
  const o = rec(v, 'item')
  const people = list(o.people, 'item people').map((p) =>
    typeof p === 'number' && Number.isSafeInteger(p) && p >= 0 ? p : fail('item people must be whole numbers'),
  )
  return { ...(has(o, 'name') ? { name: str(o, 'name') } : {}), amount: int(o, 'amount'), people }
}

function parseCharge(v: Json | undefined): Charge {
  const o = rec(v, 'charges')
  return { type: oneOf(o, 'type', ['percent', 'total'] as const), value: anyInt(o, 'value') }
}

function parseShare(v: Json): Share {
  const o = rec(v, 'share')
  return { person: int(o, 'person'), subtotal: anyInt(o, 'subtotal'), charge: anyInt(o, 'charge'), total: anyInt(o, 'total') }
}

/** `shareIds` is dropped on purpose: the public receipt docs aren't in the backup, so those links would be dead. */
function parseSplit(o: Rec): Split {
  const people = list(o.people, 'people').map((p) => (typeof p === 'string' ? p : fail('people must be text')))
  if (people.length === 0) fail('people must not be empty')
  const expenseTxId = o.expenseTxId
  return {
    title: str(o, 'title'),
    date: date(o, 'date'),
    mode: oneOf<SplitMode>(o, 'mode', ['itemized', 'even', 'exact']),
    people,
    items: list(o.items, 'items').map(parseItem),
    charges: parseCharge(o.charges),
    shares: list(o.shares, 'shares').map(parseShare),
    categoryId: str(o, 'categoryId'),
    expenseTxId:
      expenseTxId === null ? null : typeof expenseTxId === 'string' ? expenseTxId : fail('expenseTxId must be text or null'),
    createdAt: int(o, 'createdAt'),
    updatedAt: int(o, 'updatedAt'),
  }
}

function parseSettings(o: Rec): Settings {
  return {
    currency: oneOf(o, 'currency', ['MYR'] as const),
    createdAt: int(o, 'createdAt'),
    ...(has(o, 'tngQr') ? { tngQr: str(o, 'tngQr') } : {}),
  }
}

/** Every document needs a usable Firestore id, and ids must be unique inside a collection. */
function parseDocs<T>(name: string, v: Json | undefined, parse: (o: Rec) => T): WithId<T>[] {
  const seen = new Set<string>()
  return list(v, name).map((raw, i) => {
    let label = `${name}[${i}]`
    try {
      const o = rec(raw, 'document')
      const id = str(o, 'id')
      label = `${name}[${i}] (id ${id})`
      if (!id || id === '.' || id === '..' || id.includes('/') || id.startsWith('__')) fail('id is not a valid document id')
      if (seen.has(id)) fail('id appears twice')
      seen.add(id)
      return { ...parse(o), id }
    } catch (e) {
      throw e instanceof Invalid ? new Invalid(`${label}: ${e.message}`) : e
    }
  })
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

/** Check a parsed backup file by hand. Rejects the whole file at the first invalid document, and says which. */
export function validateBackup(json: Json): ParseResult {
  try {
    const o = rec(json, 'The file')
    if (o.version !== 1) fail('Unsupported backup version')
    return {
      ok: true,
      backup: {
        version: 1,
        exportedAt: int(o, 'exportedAt'),
        settings: o.settings === null ? null : parseSettings(rec(o.settings, 'settings')),
        categories: parseDocs('categories', o.categories, parseCategory),
        transactions: parseDocs('transactions', o.transactions, parseTransaction),
        recurring: parseDocs('recurring', o.recurring, parseRecurring),
        splits: parseDocs('splits', o.splits, parseSplit),
      },
    }
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message }
    throw e
  }
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const backupSummary = (b: Backup): string =>
  [
    count(b.transactions.length, 'transaction', 'transactions'),
    count(b.categories.length, 'category', 'categories'),
    count(b.recurring.length, 'rule', 'rules'),
    count(b.splits.length, 'split', 'splits'),
  ].join(', ')
