// Pure display-currency maths (type-only imports) so scripts/check-display.ts can run it under plain node.
import type { Transaction } from '@/lib/db'
import { convert, HOME } from './money.ts'

/** Date (YYYY-MM-DD) -> display units per 1 RM. ECB rates: working days only. */
export type RateSeries = Record<string, number>

/** The rate in force on `date`: the latest one on or before it, else the earliest known. Null when empty. */
export function rateOn(series: RateSeries, date: string): number | null {
  let before: string | null = null
  let first: string | null = null
  for (const d of Object.keys(series)) {
    if (d <= date && (before === null || d > before)) before = d
    if (first === null || d < first) first = d
  }
  const key = before ?? first
  return key === null ? null : series[key]
}

type Tx = Pick<Transaction, 'amount' | 'original' | 'date'>

/**
 * How totals are shown. Paid in the display currency: that exact amount. Else the RM amount at the rate on its date,
 * so past months never change. With no rate known at all (offline, nothing cached), totals stay in RM.
 */
export function shownIn(display: string, series: RateSeries): { currency: string; amountOf: (t: Tx) => number } {
  if (display === HOME || Object.keys(series).length === 0) return { currency: HOME, amountOf: (t) => t.amount }
  return {
    currency: display,
    amountOf: (t) => (t.original?.currency === display ? t.original.amount : convert(t.amount, HOME, display, rateOn(series, t.date) ?? 0)),
  }
}
