import type { Deletion } from './deletion.ts'
import { apportion } from './split.ts'

/** One earlier state of an expense, kept when it is edited so the group can audit changes. */
export type ExpenseVersion = {
  at: number
  /** Who made the edit that replaced this version. */
  by: string
  title: string
  /** Local YYYY-MM-DD. */
  date: string
  /** Integer sen. */
  amount: number
  paidBy: string
  shares: Record<string, number>
}

/** `groups/{gid}/expenses/{id}`: one thing a member paid for, and how much of it each member owes. */
export type GroupExpense = {
  title: string
  date: string
  /** Integer sen: what was paid in total. */
  amount: number
  paidBy: string
  /** Integer sen owed by each member, by uid. Sums to `amount`. */
  shares: Record<string, number>
  createdBy: string
  createdAt: number
  updatedAt: number
  /** Earlier versions, newest first. */
  previous?: ExpenseVersion[]
} & Deletion

/** The fields a member fills in. */
export type ExpenseDraft = Pick<GroupExpense, 'title' | 'date' | 'amount' | 'paidBy' | 'shares'>

/**
 * Running totals kept on the group doc, so the audit view never has to read the whole history.
 * `paid[uid]` is what a member put in, `owed[uid]` their share of everything; `sent` and `received` are the
 * settle-up payments they made and got. All only ever change by increments.
 */
export type Totals = {
  spent: number
  paid: Record<string, number>
  owed: Record<string, number>
  /** Spent per month, by YYYY-MM. */
  months: Record<string, number>
  /** Settle-up payments made / received (missing on groups from before settle-up existed). */
  sent?: Record<string, number>
  received?: Record<string, number>
}

export const emptyTotals = (): Totals => ({ spent: 0, paid: {}, owed: {}, months: {}, sent: {}, received: {} })

/** `groups/{gid}/settlements/{id}`: `from` paid `to` back. Counts in the balances at once; `to` confirms they got it. */
export type Settlement = {
  from: string
  to: string
  /** Integer sen. */
  amount: number
  /** Local YYYY-MM-DD. */
  date: string
  /** 'rejected': `to` says they didn't get it. It no longer counts, and stays until `from` has seen it and dismisses it. */
  status: 'pending' | 'confirmed' | 'rejected'
  createdBy: string
  createdAt: number
  confirmedAt?: number
  rejectedAt?: number
} & Deletion

/** One payment that would square things up. */
export type Transfer = { from: string; to: string; amount: number }

/** Edits keep this many earlier versions. */
export const MAX_HISTORY = 10

/** `amount` split equally among `uids`; the leftover sen go to the first people, so the parts always add up. */
export function evenShares(amount: number, uids: readonly string[]): Record<string, number> {
  const parts = apportion(amount, uids.map(() => 1))
  return Object.fromEntries(uids.map((uid, i) => [uid, parts[i]]))
}

/** Why these shares can't be saved, or null if they can. */
export function sharesProblem(amount: number, shares: Record<string, number>): string | null {
  const values = Object.values(shares)
  if (amount <= 0) return 'Enter an amount.'
  if (values.length === 0) return 'Pick who it is split between.'
  if (values.some((v) => !Number.isInteger(v) || v < 0)) return 'Every share must be zero or more.'
  const sum = values.reduce((a, b) => a + b, 0)
  return sum === amount ? null : sum < amount ? 'The shares are short of the total.' : 'The shares add up to more than the total.'
}

const month = (date: string) => date.slice(0, 7)

type Counted = Pick<GroupExpense, 'date' | 'amount' | 'paidBy' | 'shares'>

/** What a change from `before` to `after` does to the totals (null = no expense). Zero entries are left out. */
export function totalsDelta(before: Counted | null, after: Counted | null): Totals {
  const delta = emptyTotals()
  const add = (side: Counted | null, sign: 1 | -1) => {
    if (!side) return
    delta.spent += sign * side.amount
    delta.paid[side.paidBy] = (delta.paid[side.paidBy] ?? 0) + sign * side.amount
    for (const [uid, share] of Object.entries(side.shares)) delta.owed[uid] = (delta.owed[uid] ?? 0) + sign * share
    delta.months[month(side.date)] = (delta.months[month(side.date)] ?? 0) + sign * side.amount
  }
  add(before, -1)
  add(after, 1)
  for (const map of [delta.paid, delta.owed, delta.months])
    for (const [k, v] of Object.entries(map)) if (v === 0) delete map[k]
  return delta
}

/** What recording (sign 1) or taking back (sign -1) a settle-up payment does to the totals. */
export function settlementDelta(s: Pick<Settlement, 'from' | 'to' | 'amount'>, sign: 1 | -1): Totals {
  return { ...emptyTotals(), sent: { [s.from]: sign * s.amount }, received: { [s.to]: sign * s.amount } }
}

/** Totals with a delta applied (what the increments add up to on the server). */
export function applyDelta(totals: Totals, delta: Totals): Totals {
  const merge = (a: Record<string, number>, b: Record<string, number>) => {
    const out = { ...a }
    for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v
    return out
  }
  return {
    spent: totals.spent + delta.spent,
    paid: merge(totals.paid, delta.paid),
    owed: merge(totals.owed, delta.owed),
    months: merge(totals.months, delta.months),
    sent: merge(totals.sent ?? {}, delta.sent ?? {}),
    received: merge(totals.received ?? {}, delta.received ?? {}),
  }
}

/** What the group owes this member (positive) or what they owe the group (negative), settle-up payments included. */
export const netOf = (totals: Pick<Totals, 'paid' | 'owed' | 'sent' | 'received'>, uid: string) =>
  (totals.paid[uid] ?? 0) - (totals.owed[uid] ?? 0) + (totals.sent?.[uid] ?? 0) - (totals.received?.[uid] ?? 0)

/**
 * The fewest simple payments that square everyone up: the biggest debtor pays the biggest creditor, and so on (at most
 * one fewer payment than people). Ties go by uid, so everyone in the group sees the same list. `nets` sums to zero.
 */
export function suggestTransfers(nets: Record<string, number>): Transfer[] {
  const side = (sign: 1 | -1) =>
    Object.entries(nets)
      .filter(([, n]) => n * sign > 0)
      .map(([uid, n]) => ({ uid, left: Math.abs(n) }))
      .toSorted((a, b) => b.left - a.left || a.uid.localeCompare(b.uid))
  const debtors = side(-1)
  const creditors = side(1)
  const out: Transfer[] = []
  let d = 0
  let c = 0
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].left, creditors[c].left)
    out.push({ from: debtors[d].uid, to: creditors[c].uid, amount })
    debtors[d].left -= amount
    creditors[c].left -= amount
    if (debtors[d].left === 0) d++
    if (creditors[c].left === 0) c++
  }
  return out
}

/** The edit history after `old` is replaced by an edit of `by` at `at`: old goes in front, the list stays short. */
export function nextHistory(old: GroupExpense, by: string, at: number): ExpenseVersion[] {
  const { title, date, amount, paidBy, shares } = old
  return [{ at, by, title, date, amount, paidBy, shares }, ...(old.previous ?? [])].slice(0, MAX_HISTORY)
}

/** Whether every person in the expense is still in the group (the rules only let an expense name current members). */
export const involvesOnly = (expense: Pick<GroupExpense, 'paidBy' | 'shares'>, memberUids: readonly string[]) =>
  [expense.paidBy, ...Object.keys(expense.shares)].every((uid) => memberUids.includes(uid))
