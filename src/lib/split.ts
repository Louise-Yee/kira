// Pure split maths: integer sen only, no float maths on money, no imports (so scripts/check-split.ts runs under plain node).

export type SplitItem = {
  name?: string
  /** Integer sen. */
  amount: number
  /** Indices into the people list. */
  people: number[]
}

/** `percent`: value in basis points (16% = 1600). `total`: the receipt total in sen. */
export type Charge = { type: 'percent'; value: number } | { type: 'total'; value: number }

export type Share = {
  /** Index into the people list. */
  person: number
  /** Their part of the items, before any charge. */
  subtotal: number
  /** Their part of the charge (negative for a discount). */
  charge: number
  total: number
}

export type SplitResult = { shares: Share[]; subtotal: number; total: number }

/**
 * Split `amount` in proportion to `weights` (non-negative integers) so the parts sum exactly to `amount`:
 * floor each part, then hand the leftover sen to the biggest fractional parts (ties go to the lower index).
 * BigInt, because amount × weight can pass 2^53 for large bills.
 */
export function apportion(amount: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + BigInt(b), 0n)
  if (sum === 0n) return weights.map(() => 0)
  const parts = weights.map((w) => {
    const num = BigInt(amount) * BigInt(w)
    return { floor: num / sum, rem: num % sum }
  })
  let left = Number(BigInt(amount) - parts.reduce((a, p) => a + p.floor, 0n))
  const order = parts.map((_, i) => i).toSorted((a, b) => (parts[a].rem === parts[b].rem ? a - b : parts[a].rem > parts[b].rem ? -1 : 1))
  const out = parts.map((p) => Number(p.floor))
  for (const i of order) {
    if (left-- <= 0) break
    out[i] += 1
  }
  return out
}

/** One item divided equally among its people (6.80 / 3 -> 2.27, 2.27, 2.26). */
export function splitItem(item: SplitItem): { person: number; amount: number }[] {
  const parts = apportion(item.amount, item.people.map(() => 1))
  return item.people.map((person, i) => ({ person, amount: parts[i] }))
}

/** The grand total after the charge, rounded half up to the sen. */
export function grandTotal(subtotal: number, charge: Charge): number {
  if (charge.type === 'total') return charge.value
  const num = BigInt(subtotal) * BigInt(10000 + charge.value)
  return Number((num + 5000n) / 10000n)
}

/**
 * Every person's share of the bill. Items are split equally among their people, the charge (a percentage on
 * top, or the actual receipt total) is spread in proportion to each subtotal, and the shares always add up
 * exactly to the grand total.
 */
export function computeShares({ people, items, charges }: { people: number; items: readonly SplitItem[]; charges: Charge }): SplitResult {
  const subtotals = Array.from({ length: people }, () => 0)
  for (const item of items) for (const { person, amount } of splitItem(item)) subtotals[person] += amount
  const subtotal = subtotals.reduce((a, b) => a + b, 0)
  const total = subtotal === 0 ? 0 : grandTotal(subtotal, charges)
  const totals = apportion(total, subtotals)
  return {
    shares: subtotals.map((s, person) => ({ person, subtotal: s, charge: totals[person] - s, total: totals[person] })),
    subtotal,
    total,
  }
}

/** Even mode: one item for the whole bill, shared by everyone. */
export const evenItems = (amount: number, people: number): SplitItem[] => [{ amount, people: Array.from({ length: people }, (_, i) => i) }]

/** Exact mode: each person's own amount (people owing 0 are left out). */
export const exactItems = (amounts: readonly number[]): SplitItem[] =>
  amounts.flatMap((amount, person) => (amount > 0 ? [{ amount, people: [person] }] : []))
