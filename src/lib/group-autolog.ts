// Turns a group's expenses into my own transactions. Plain .ts with no imports (Node-runnable for the self-check).

/** `users/{uid}/groupLogs/{gid}`: whether my share of this group's expenses is added to my transactions. */
export type GroupLog = {
  enabled: boolean
  /** The category those transactions get. */
  categoryId: string
  /** Only expenses dated this day or later are added (local YYYY-MM-DD): turning it on never backfills old ones. */
  from: string
  updatedAt: number
}

/** The id of the transaction that holds my share of one group expense (the same id every time, so a write is idempotent). */
export const logTxId = (gid: string, expenseId: string) => `g_${gid}_${expenseId}`

/** What was last written for each expense, by expense id. Lets a launch skip expenses that haven't changed. */
export type Synced = Record<string, { date: string; updatedAt: number }>

export type LoggedExpense = { id: string; date: string; title: string; shares: Record<string, number>; updatedAt: number }

export type SyncPlan = {
  /** New transactions (`isNew`) and amount/date updates of ones already made. */
  upserts: { expenseId: string; amount: number; date: string; title: string; isNew: boolean }[]
  /** Expenses whose transaction should go: deleted, or no longer including my share. */
  removals: string[]
  /** `synced` once all of this has been written. */
  next: Synced
}

/**
 * What to write so my transactions match the expenses in the window (`windowSince` or later).
 * Only expenses with a share of mine become transactions; one I'm no longer in, or that was deleted, is removed.
 * An expense that merely aged out of the window is left alone.
 */
export function planSync(me: string, expenses: readonly LoggedExpense[], synced: Synced, windowSince: string): SyncPlan {
  const upserts: SyncPlan['upserts'] = []
  const removals: string[] = []
  const next: Synced = {}
  const seen = new Set<string>()
  for (const e of expenses) {
    seen.add(e.id)
    const share = e.shares[me] ?? 0
    const before = synced[e.id]
    if (share <= 0) {
      if (before) removals.push(e.id)
      continue
    }
    next[e.id] = { date: e.date, updatedAt: e.updatedAt }
    if (!before || before.updatedAt !== e.updatedAt) upserts.push({ expenseId: e.id, amount: share, date: e.date, title: e.title, isNew: !before })
  }
  for (const [id, before] of Object.entries(synced)) {
    if (seen.has(id)) continue
    if (before.date >= windowSince) removals.push(id)
    else next[id] = before
  }
  return { upserts, removals, next }
}
