// Pure receipt content (type-only imports besides split.ts) so scripts/check-receipt.ts can run it under plain node.
import { formatPercent, splitItem, type Charge, type Share, type SplitItem, type SplitMode } from './split.ts'

export type ReceiptRow = { label: string; amount: number }
export type ReceiptPerson = { name: string; rows: ReceiptRow[]; subtotal: number; charge: number; total: number }
export type Receipt = {
  title: string
  date: string
  people: ReceiptPerson[]
  /** The whole bill when showing everyone, or that person's total when showing one. */
  total: number
  /** "Tax & service 16%", or "" when there is no charge. */
  chargeLabel: string
  everyone: boolean
}

type SplitLike = {
  title: string
  date: string
  mode: SplitMode
  people: string[]
  items: SplitItem[]
  charges: Charge
  shares: Share[]
}

const rowLabel = (mode: SplitMode, item: SplitItem, index: number): string => {
  const base = mode === 'even' ? 'Shared equally' : mode === 'exact' ? 'Amount' : item.name || `Item ${index + 1}`
  return item.people.length > 1 && mode === 'itemized' ? `${base} ÷${item.people.length}` : base
}

/**
 * What a receipt shows. Subtotals, charges and totals come from the split's stored shares (fixed values);
 * each person's rows are their part of every item they are on. `only` (a person index) makes a receipt for
 * just that person, so nobody else's items are shown.
 */
export function buildReceipt(split: SplitLike, only?: number): Receipt {
  const everyone = only === undefined
  const chosen = split.people.map((name, person) => ({ name, person })).filter((p) => everyone || p.person === only)
  const people = chosen.map(({ name, person }) => {
    const rows = split.items.flatMap((item, i) => {
      const mine = splitItem(item).find((s) => s.person === person)
      return mine ? [{ label: rowLabel(split.mode, item, i), amount: mine.amount }] : []
    })
    const share = split.shares[person]
    return { name, rows, subtotal: share.subtotal, charge: share.charge, total: share.total }
  })
  const { charges } = split
  const chargeLabel =
    split.mode === 'exact' || (charges.type === 'percent' && charges.value === 0)
      ? ''
      : charges.type === 'percent'
        ? `Tax & service ${formatPercent(charges.value)}%`
        : 'Tax & service'
  return {
    title: split.title,
    date: split.date,
    people,
    total: people.reduce((n, p) => n + p.total, 0),
    chargeLabel,
    everyone,
  }
}
