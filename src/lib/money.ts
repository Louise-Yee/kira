const MAX_DIGITS = 9 // RM 9,999,999.99

/** The home currency: every stored `amount` (and every total) is in its sen. */
export const HOME = 'MYR'

/** A transaction entered in another currency: `amount` in that currency's minor unit, `rate` = RM per 1 unit. */
export type Original = { currency: string; amount: number; rate: number }

/** Decimal places of a currency's minor unit: JPY 0, MYR 2, KWD 3. */
export const minorDigits = (currency: string): number =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2

/** TNG-style entry: keep digits only, drop leading zeros, cap at 9 digits. "123" -> 123 (sen, or any minor unit). */
export function digitsToSen(text: string): number {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS)
  return digits ? Number(digits) : 0
}

/** Integer minor units -> "1,234.50" (magnitude only, no prefix or sign). `digits` 0 gives "1,234". */
export function formatSen(sen: number, digits = 2): string {
  const n = Math.abs(sen)
  const unit = 10 ** digits
  const whole = Math.floor(n / unit).toLocaleString('en-US')
  return digits ? `${whole}.${String(n % unit).padStart(digits, '0')}` : whole
}

/** Integer minor units -> "1234.50" (no grouping, for CSV and other machine-read output). */
export function senToDecimal(sen: number, digits = 2): string {
  const unit = 10 ** digits
  return digits ? `${Math.floor(sen / unit)}.${String(sen % unit).padStart(digits, '0')}` : String(sen)
}

const symbolPart = (locale: string, currency: string, currencyDisplay: 'symbol' | 'narrowSymbol') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay }).formatToParts(1).find((p) => p.type === 'currency')?.value ??
  currency

const narrow = (c: string) => symbolPart('en', c, 'narrowSymbol')
let narrowCounts: Map<string, number> | null = null

/**
 * How an amount is labelled: RM; a currency's own symbol when no other currency shares it (€ £ ฿ ₩ Rp);
 * else a prefixed one (US$ S$ A$ JP¥ CN¥), so dollars and yen/yuan can't be mixed up; else the code (CHF).
 */
export function currencySymbol(currency: string): string {
  if (currency === HOME) return 'RM'
  if (!narrowCounts) {
    narrowCounts = new Map()
    for (const c of Intl.supportedValuesOf('currency')) narrowCounts.set(narrow(c), (narrowCounts.get(narrow(c)) ?? 0) + 1)
  }
  const n = narrow(currency)
  if (narrowCounts.get(n) === 1) return n
  const local = symbolPart('en-MY', currency, 'symbol')
  // en-MY still gives a code for some shared ones (SGD): put the code's first letter in front, as S$ is written.
  return /^[A-Z]{3}$/.test(local) ? `${currency[0]}${n}` : local
}

/** Integer minor units -> "RM 1,234.50" / "JP¥3,000" / "CHF 5.00". Negatives always get "−" (U+2212); `sign` adds "+" for positives. */
export function formatMoney(sen: number, currency = HOME, { sign = false }: { sign?: boolean } = {}): string {
  const symbol = currencySymbol(currency)
  // A space after a letter label (RM, CHF), none after a symbol (US$25).
  const body = `${symbol}${/[A-Za-z]$/.test(symbol) ? ' ' : ''}${formatSen(sen, minorDigits(currency))}`
  if (sen < 0) return `−${body}`
  return sign && sen > 0 ? `+${body}` : body
}

/** Integer sen -> "RM 1,234.50". */
export const formatRM = (sen: number, opts?: { sign?: boolean }): string => formatMoney(sen, HOME, opts)

/**
 * `amount` (minor units of `currency`) -> RM sen at `rate` (RM per 1 unit), rounded half up.
 * The rate is scaled to an integer (8 decimals) so the money maths itself stays integer.
 */
export function toSen(amount: number, currency: string, rate: number): number {
  const num = BigInt(amount) * BigInt(Math.round(rate * 1e8)) * 100n
  const den = 10n ** BigInt(minorDigits(currency)) * 100_000_000n
  return Number((num + den / 2n) / den)
}

/**
 * What gets stored for an amount entered in `currency`: RM sen, plus the original when it is foreign.
 * Null while a foreign amount has no rate yet.
 */
export function toHome(amount: number, currency: string, rate: number | null): { amount: number; original?: Original } | null {
  if (currency === HOME) return { amount }
  return rate ? { amount: toSen(amount, currency, rate), original: { currency, amount, rate } } : null
}

/** A typed exchange rate ("0.0259", "4.11"), or null if it isn't a positive number. */
export function parseRate(text: string): number | null {
  if (!/^\d{1,7}(\.\d{1,8})?$/.test(text.trim())) return null
  const rate = Number(text)
  return rate > 0 ? rate : null
}

/** 0.025923 -> "0.025923", 4.1125 -> "4.1125" (6 significant digits, no trailing zeros). */
export const formatRate = (rate: number): string => String(Number(rate.toPrecision(6)))

/** How a stored amount was entered, to fill a form: the original when foreign, else the RM sen. */
export const entered = (x?: { amount: number; original?: Original }): { currency: string; amount: number; rate: number | null } =>
  x?.original ? { ...x.original } : { currency: HOME, amount: x?.amount ?? 0, rate: null }
