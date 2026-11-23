// Pure chart maths (type-only imports) so scripts/check-chart-data.ts can run it under plain node.
import type { Transaction } from '@/lib/db'
import type { AmountOf } from './month-summary.ts'

type Tx = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'date'>

export type CategoryShare = { categoryId: string; amount: number; percent: number }
export type CategoryBreakdown = {
  /** Biggest first. */
  rows: CategoryShare[]
  /** Everything past the top rows, folded together; null when nothing was folded. */
  others: { amount: number; percent: number } | null
  /** Total expense in sen. */
  total: number
}

/** Expense per category, biggest first. Rows past `limit` fold into `others`. Percents are whole numbers that add up to 100. */
export function byCategory<T extends Tx>(txs: readonly T[], limit = 6, amountOf: AmountOf<T> = (t) => t.amount): CategoryBreakdown {
  const sums = new Map<string, number>()
  for (const t of txs) if (t.kind === 'expense') sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + amountOf(t))
  const total = [...sums.values()].reduce((a, b) => a + b, 0)
  const sorted = [...sums]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .toSorted((a, b) => b.amount - a.amount || a.categoryId.localeCompare(b.categoryId))
  const pct = (amount: number) => (total ? Math.round((amount / total) * 100) : 0)
  const rows = sorted.slice(0, limit).map((r) => ({ ...r, percent: pct(r.amount) }))
  const rest = sorted.slice(limit).reduce((n, r) => n + r.amount, 0)
  const others = rest ? { amount: rest, percent: Math.max(0, 100 - rows.reduce((n, r) => n + r.percent, 0)) } : null
  return { rows, others, total }
}

export type MonthTotals = { ym: string; income: number; expense: number }

/** Income and expense per month, in the order of `yms`. Transactions outside those months are ignored. */
export function monthlyTotals<T extends Tx>(txs: readonly T[], yms: readonly string[], amountOf: AmountOf<T> = (t) => t.amount): MonthTotals[] {
  const out = new Map<string, MonthTotals>(yms.map((ym) => [ym, { ym, income: 0, expense: 0 }]))
  for (const t of txs) {
    const m = out.get(t.date.slice(0, 7))
    if (m) m[t.kind] += amountOf(t)
  }
  return yms.map((ym) => out.get(ym)!)
}
