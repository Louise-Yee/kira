const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n: number) => String(n).padStart(2, '0')

/** Local date as YYYY-MM-DD. Never toISOString(): that is UTC (wrong before 8am in Malaysia). */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "2026-11" shifted by n months (n may be negative). */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const idx = y * 12 + (m - 1) + n
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`
}

/** Half-open range: start inclusive, end exclusive (first day of next month). */
export function monthRange(ym: string): { start: string; end: string } {
  return { start: `${ym}-01`, end: `${addMonths(ym, 1)}-01` }
}

/** "2026-11" -> "November 2026". */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}
