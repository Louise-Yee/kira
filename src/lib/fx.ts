import { useEffect, useState } from 'react'
import { todayISO } from '@/lib/date'
import { HOME } from '@/lib/money'

// Free ECB rates, no key, CORS open. ~30 currencies; the others 404 and are typed by hand.
const API = 'https://api.frankfurter.dev/v1'
const RATES_KEY = 'kira:fx-rates'
const RECENT_KEY = 'kira:recent-currencies'

type Cached = Record<string, { rate: number; date: string }>

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: Cached | string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked or full: rates are then fetched every time, which is fine.
  }
}

/** The newest rate this device has seen for `currency` (RM per 1 unit), for when it's offline. */
export const cachedRate = (currency: string): number | null => read<Cached>(RATES_KEY, {})[currency]?.rate ?? null

/**
 * RM per 1 `currency` on `date` (the last working day before it on weekends; today's when `date` is absent or
 * ahead). Offline it falls back to the cached rate; null when the API doesn't have the currency.
 */
export async function fetchRate(currency: string, date?: string): Promise<number | null> {
  const when = date && date < todayISO() ? date : 'latest'
  let res: Response
  try {
    res = await fetch(`${API}/${when}?base=${currency}&symbols=${HOME}`)
  } catch {
    return cachedRate(currency)
  }
  if (!res.ok) return res.status === 404 ? null : cachedRate(currency)
  const body = (await res.json()) as { date: string; rates: Record<string, number | undefined> }
  const rate = body.rates[HOME]
  if (!rate) return null
  const all = read<Cached>(RATES_KEY, {})
  if (!all[currency] || body.date >= all[currency].date) write(RATES_KEY, { ...all, [currency]: { rate, date: body.date } })
  return rate
}

/** The fetched rate for `currency` on `date`. `loading` until it answers; nothing is fetched for RM. */
export function useRate(currency: string, date?: string): { rate: number | null; loading: boolean } {
  const key = `${currency}|${date ?? ''}`
  const [got, setGot] = useState<{ key: string; rate: number | null } | null>(null)
  useEffect(() => {
    if (currency === HOME) return
    let live = true
    void fetchRate(currency, date).then((rate) => live && setGot({ key: `${currency}|${date ?? ''}`, rate }))
    return () => {
      live = false
    }
  }, [currency, date])
  if (currency === HOME) return { rate: 1, loading: false }
  return got?.key === key ? { rate: got.rate, loading: false } : { rate: null, loading: true }
}

/** Currencies picked lately, newest first (never RM, which is always offered first). */
export const recentCurrencies = (): string[] => read<string[]>(RECENT_KEY, [])

export function rememberCurrency(currency: string) {
  if (currency === HOME) return
  write(RECENT_KEY, [currency, ...recentCurrencies().filter((c) => c !== currency)].slice(0, 5))
}
