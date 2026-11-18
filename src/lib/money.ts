const MAX_DIGITS = 9 // RM 9,999,999.99

/** TNG-style entry: keep digits only, drop leading zeros, cap at 9 digits. "123" -> 123 sen. */
export function digitsToSen(text: string): number {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS)
  return digits ? Number(digits) : 0
}

/** Integer sen -> "1,234.50" (magnitude only, no prefix or sign). */
export const formatSen = (sen: number): string =>
  `${Math.floor(Math.abs(sen) / 100).toLocaleString('en-US')}.${String(Math.abs(sen) % 100).padStart(2, '0')}`

/** Integer sen -> "1234.50" (no grouping, for CSV and other machine-read output). */
export const senToDecimal = (sen: number): string => `${Math.floor(sen / 100)}.${String(sen % 100).padStart(2, '0')}`

/** Integer sen -> "RM 1,234.50". Negatives always get "−" (U+2212); `sign` adds "+" for positives. */
export function formatRM(sen: number, { sign = false }: { sign?: boolean } = {}): string {
  const body = `RM ${formatSen(sen)}`
  if (sen < 0) return `−${body}`
  return sign && sen > 0 ? `+${body}` : body
}
