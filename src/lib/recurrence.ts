export type Freq = 'day' | 'week' | 'month' | 'year'
export type RecurrenceEnd = { type: 'never' } | { type: 'date'; value: string } | { type: 'count'; value: number }
export type RecurrenceRule = {
  freq: Freq
  interval: number
  /** Local YYYY-MM-DD. */
  startDate: string
  end: RecurrenceEnd
  paused: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** Date of occurrence `n` (0-based). Always computed from startDate, never from the previous occurrence. */
export function occurrenceDate(rule: Pick<RecurrenceRule, 'freq' | 'interval' | 'startDate'>, n: number): string {
  const [y, m, d] = rule.startDate.split('-').map(Number)
  const step = n * rule.interval
  if (rule.freq === 'day' || rule.freq === 'week') {
    // UTC date parts, so DST can never shift a day.
    const t = new Date(Date.UTC(y, m - 1, d + step * (rule.freq === 'week' ? 7 : 1)))
    return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
  }
  const idx = y * 12 + (m - 1) + step * (rule.freq === 'year' ? 12 : 1)
  const ty = Math.floor(idx / 12)
  const tm = (idx % 12) + 1
  return fmt(ty, tm, Math.min(d, daysInMonth(ty, tm)))
}

/** Whether occurrence `n` falls inside the rule's end condition. */
const withinEnd = (rule: RecurrenceRule, n: number) =>
  rule.end.type === 'never' ||
  (rule.end.type === 'count' ? n < rule.end.value : occurrenceDate(rule, n) <= rule.end.value)

/** Every n >= fromIndex that is due on or before `today`. Paused rules have none; so do bad intervals (< 1), which would loop forever. */
export function dueIndices(rule: RecurrenceRule, fromIndex: number, today: string): number[] {
  const out: number[] = []
  if (rule.paused || !(rule.interval >= 1)) return out
  for (let n = fromIndex; withinEnd(rule, n) && occurrenceDate(rule, n) <= today; n++) out.push(n)
  return out
}

/** Date of the next occurrence at or after `fromIndex`, or null once the rule has ended. */
export const nextDate = (rule: RecurrenceRule, fromIndex: number): string | null =>
  withinEnd(rule, fromIndex) ? occurrenceDate(rule, fromIndex) : null

/** "Every month", "Every 3 weeks". */
export const describeFrequency = (freq: Freq, interval: number): string =>
  interval === 1 ? `Every ${freq}` : `Every ${interval} ${freq}s`

/** Changing any of these rewrites history, so the old rule must end and a new one start. */
export const scheduleChanged = (
  a: Pick<RecurrenceRule, 'freq' | 'interval' | 'startDate'>,
  b: Pick<RecurrenceRule, 'freq' | 'interval' | 'startDate'>,
): boolean => a.freq !== b.freq || a.interval !== b.interval || a.startDate !== b.startDate

/**
 * Earliest start for a rule that replaces `old` after it posted `posted` payments: the date its next payment
 * was due. Starting earlier would post those dates a second time.
 */
export const restartFloor = (old: Pick<RecurrenceRule, 'freq' | 'interval' | 'startDate'>, posted: number): string =>
  occurrenceDate(old, posted)
