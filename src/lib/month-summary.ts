// Pure month maths (type-only imports) so scripts/check-month.ts can run it under plain node.
import type { Transaction } from '@/lib/db'

type Tx = Pick<Transaction, 'kind' | 'amount' | 'date' | 'createdAt'>

/** Signed sen: income positive, expense negative. */
export const signed = (t: Pick<Transaction, 'kind' | 'amount'>): number => (t.kind === 'income' ? t.amount : -t.amount)

export function totals(txs: readonly Tx[]): { income: number; expense: number } {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.kind === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense }
}

/** Groups by date in the order dates first appear (input is newest first); newest entry first within a day. */
export function groupByDay<T extends Tx>(txs: readonly T[]): { date: string; items: T[]; net: number }[] {
  const days = new Map<string, T[]>()
  for (const t of txs) days.set(t.date, [...(days.get(t.date) ?? []), t])
  return [...days].map(([date, items]) => ({
    date,
    items: items.toSorted((a, b) => b.createdAt - a.createdAt),
    net: items.reduce((sum, t) => sum + signed(t), 0),
  }))
}
