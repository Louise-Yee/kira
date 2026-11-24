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

export type SplitMode = 'itemized' | 'even' | 'exact'

/** A person on a split who is one of my friends on kira, so they keep their photo (not just a typed name). */
export type SplitFriend = { uid: string; photoURL: string | null }

/** Everything the editor holds. `people[0]` is always me. `exact` has one amount per person. */
export type SplitForm = {
  mode: SplitMode
  people: string[]
  /** The people who are friends, by person index (as a string, like Firestore map keys). */
  friends?: Record<string, SplitFriend>
  items: SplitItem[]
  /** Even mode: the whole bill, in sen. */
  evenTotal: number
  exact: number[]
  charges: Charge
}

export const addPerson = (form: SplitForm, name: string, friend?: SplitFriend): SplitForm => ({
  ...form,
  people: [...form.people, name],
  exact: [...form.exact, 0],
  ...(friend ? { friends: { ...form.friends, [form.people.length]: friend } } : {}),
})

/** Remove a person (never me, index 0) and re-point every item at the people who are left. */
export function removePerson(form: SplitForm, index: number): SplitForm {
  if (index <= 0 || index >= form.people.length) return form
  return {
    ...form,
    people: form.people.filter((_, i) => i !== index),
    exact: form.exact.filter((_, i) => i !== index),
    friends: Object.fromEntries(
      Object.entries(form.friends ?? {}).flatMap(([k, f]) => (Number(k) === index ? [] : [[String(Number(k) > index ? Number(k) - 1 : Number(k)), f]])),
    ),
    items: form.items.map((item) => ({
      ...item,
      people: item.people.filter((p) => p !== index).map((p) => (p > index ? p - 1 : p)),
    })),
  }
}

/** The items the maths runs on, whichever mode the form is in. */
export function resolveItems(form: SplitForm): SplitItem[] {
  if (form.mode === 'even') return evenItems(form.evenTotal, form.people.length)
  if (form.mode === 'exact') return exactItems(form.exact)
  return form.items
}

/** Exact mode has no tax or charges: each person pays exactly their amount. */
export const computeForm = (form: SplitForm): SplitResult =>
  computeShares({ people: form.people.length, items: resolveItems(form), charges: form.mode === 'exact' ? { type: 'percent', value: 0 } : form.charges })

/** Rebuild the editor form from a saved split (the inverse of `resolveItems`). */
export function formFromSplit(s: { mode: SplitMode; people: string[]; friends?: Record<string, SplitFriend>; items: SplitItem[]; charges: Charge }): SplitForm {
  const exact = s.people.map(() => 0)
  if (s.mode === 'exact') for (const item of s.items) exact[item.people[0]] += item.amount
  return {
    mode: s.mode,
    people: s.people,
    ...(s.friends ? { friends: s.friends } : {}),
    items: s.mode === 'itemized' ? s.items : [],
    evenTotal: s.mode === 'even' ? (s.items[0]?.amount ?? 0) : 0,
    exact,
    charges: s.charges,
  }
}

/** What the others still owe on a saved split: the sum of unpaid shares, and how many people that is. `owed` 0 with `people` > 0 means settled. */
export function owedOn(split: { shares: readonly Share[]; paid?: Record<string, true> }): { owed: number; people: number; unpaid: number } {
  const others = split.shares.filter((s) => s.person > 0 && s.total > 0)
  const unpaid = others.filter((s) => !split.paid?.[s.person])
  return { owed: unpaid.reduce((n, s) => n + s.total, 0), people: others.length, unpaid: unpaid.length }
}

/** Why the form can't be saved yet, or null when it can. */
export function splitProblem(form: SplitForm): string | null {
  if (form.people.length < 2) return 'Add at least one other person.'
  if (form.mode === 'itemized') {
    if (form.items.length === 0) return 'Add at least one item.'
    if (form.items.some((i) => i.amount <= 0)) return 'Every item needs an amount.'
    if (form.items.some((i) => i.people.length === 0)) return 'Pick who shares each item.'
  }
  if (form.mode === 'even' && form.evenTotal <= 0) return 'Enter the total.'
  if (form.mode === 'exact' && !form.exact.some((a) => a > 0)) return 'Enter an amount for at least one person.'
  if (form.mode !== 'exact' && form.charges.type === 'total' && form.charges.value <= 0) return 'Enter the receipt total.'
  return null
}

/** "16" -> 1600, "6.5" -> 650, "16.25" -> 1625 (basis points, no float maths). Null if invalid or over 100%. */
export function parsePercent(text: string): number | null {
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(text.trim())
  if (!m) return null
  const bp = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return bp <= 10000 ? bp : null
}

/** 1600 -> "16", 650 -> "6.5", 1625 -> "16.25". */
export function formatPercent(bp: number): string {
  const whole = Math.floor(bp / 100)
  const frac = String(bp % 100).padStart(2, '0').replace(/0$/, '')
  return frac === '0' || frac === '' ? String(whole) : `${whole}.${frac}`
}
