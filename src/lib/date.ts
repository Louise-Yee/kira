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

/** Half-open range covering whole months fromYm..toYm inclusive. */
export function monthsRange(fromYm: string, toYm: string): { start: string; end: string } {
  return { start: `${fromYm}-01`, end: `${addMonths(toYm, 1)}-01` }
}

/** The `n` months ending at `ym`, oldest first. */
export const lastMonths = (ym: string, n: number): string[] => Array.from({ length: n }, (_, i) => addMonths(ym, i - n + 1))

/** The months the Home trend covers: 6 ending at the current one, oldest first. */
export const trendMonths = (currentYm: string): string[] => lastMonths(currentYm, 6)

/** Whether `ym` falls inside the trend window, so its transactions are already loaded. */
export const inTrendWindow = (ym: string, currentYm: string): boolean => ym >= trendMonths(currentYm)[0] && ym <= currentYm

/** "2026-11" -> "November 2026". */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

/** "2026-11" -> "November". */
export const monthName = (ym: string): string => MONTHS[Number(ym.split('-')[1]) - 1]

/** "2026-12-01" -> "1 Dec". */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Today", "Yesterday", else "Mon, 10 Nov". `today` is passed in so this stays pure. */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return 'Today'
  const [y, m, d] = iso.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  if (iso === todayISO(new Date(ty, tm - 1, td - 1))) return 'Yesterday'
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${shortDate(iso)}`
}
