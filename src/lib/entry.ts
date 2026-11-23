// Pure entry-form logic: no React or Firebase imports, so scripts/check-entry.ts runs under plain node.
import type { Kind } from './db/types.ts'
import { HOME } from './money.ts'

/** The fields a transaction and a recurring rule share. `amount` is in minor units of `currency`; `rate` is the one typed by hand (null uses the fetched one). */
export type Entry = { kind: Kind; amount: number; currency: string; rate: number | null; categoryId: string | null; note: string }

/** What still stops an entry from saving, or null. `rate` is the one in use (typed or fetched). */
export function entryProblem(value: Entry, rate: number | null): string | null {
  if (value.amount <= 0) return 'Enter an amount.'
  if (value.currency !== HOME && !rate) return `Enter the rate for ${value.currency}.`
  if (!value.categoryId) return 'Pick a category.'
  return null
}
