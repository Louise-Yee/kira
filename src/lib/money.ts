const MAX_DIGITS = 9 // RM 9,999,999.99

/** TNG-style entry: keep digits only, drop leading zeros, cap at 9 digits. "123" -> 123 sen. */
export function digitsToSen(text: string): number {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS)
  return digits ? Number(digits) : 0
}

/** Integer sen -> "RM 1,234.50". `sign` adds "+" / "−" (U+2212); zero gets none. */
export function formatRM(sen: number, { sign = false }: { sign?: boolean } = {}): string {
  const abs = Math.abs(sen)
  const body = `RM ${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`
  if (sen < 0) return `−${body}`
  return sign && sen > 0 ? `+${body}` : body
}
