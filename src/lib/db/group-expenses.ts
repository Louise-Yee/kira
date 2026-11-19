import { useMemo } from 'react'
import { FieldPath, collection, doc, increment, limit, orderBy, query, where, writeBatch, type FieldValue, type WriteBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { nextHistory, totalsDelta, type ExpenseDraft, type GroupExpense, type Totals } from '@/lib/group-ledger'
import { converter, reportError } from './core'
import type { Me } from './friends'
import { groupRef } from './groups'
import type { WithId } from './types'
import { useDocs } from './use-docs'

/** Older expenses load this many at a time, so reads stay bounded. */
export const EXPENSES_PAGE = 30

const expenses = (gid: string) => collection(db, 'groups', gid, 'expenses').withConverter(converter<GroupExpense>())

/** Expenses dated `since` or later, newest first. */
export const recentExpensesQuery = (gid: string, since: string) => query(expenses(gid), where('date', '>=', since), orderBy('date', 'desc'))

/** Expenses dated `since` or later, newest first. The window is short, so it has no limit. */
export function useRecentExpenses(gid: string, since: string) {
  const q = useMemo(() => recentExpensesQuery(gid, since), [gid, since])
  return useDocs(q)
}

/** Up to `count` expenses dated before `before`, newest first. `enabled` false opens no listener. */
export function useOlderExpenses(gid: string, before: string, count: number, enabled: boolean) {
  const q = useMemo(
    () => (enabled ? query(expenses(gid), where('date', '<', before), orderBy('date', 'desc'), limit(count)) : null),
    [gid, before, count, enabled],
  )
  return useDocs(q)
}

/**
 * Add `d` to the group's running totals in the same batch as the expense, with increments so two members adding at
 * once can't overwrite each other. (Field paths are built with FieldPath: a month like 2026-11 isn't a plain name.)
 */
export function bumpTotals(batch: WriteBatch, gid: string, d: Totals, now: number) {
  const more: (FieldPath | FieldValue)[] = []
  for (const [k, v] of Object.entries(d.paid)) more.push(new FieldPath('totals', 'paid', k), increment(v))
  for (const [k, v] of Object.entries(d.owed)) more.push(new FieldPath('totals', 'owed', k), increment(v))
  for (const [k, v] of Object.entries(d.months)) more.push(new FieldPath('totals', 'months', k), increment(v))
  for (const [k, v] of Object.entries(d.sent ?? {})) more.push(new FieldPath('totals', 'sent', k), increment(v))
  for (const [k, v] of Object.entries(d.received ?? {})) more.push(new FieldPath('totals', 'received', k), increment(v))
  batch.update(groupRef(gid), new FieldPath('totals', 'spent'), increment(d.spent), ...more, 'updatedAt', now)
}

/**
 * Add an expense to a group, or edit one (`existing`, by its author). The old version goes into the history, and the
 * group's totals move by the difference. One batch, never awaited.
 */
export function saveGroupExpense(me: Me, gid: string, draft: ExpenseDraft, existing?: WithId<GroupExpense>) {
  const now = Date.now()
  const id = existing?.id ?? doc(expenses(gid)).id
  const data: GroupExpense = {
    ...draft,
    createdBy: existing?.createdBy ?? me.uid,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    // Firestore rejects undefined fields, so history only exists once there is some.
    ...(existing ? { previous: nextHistory(existing, me.uid, now) } : {}),
  }
  const batch = writeBatch(db)
  batch.set(doc(expenses(gid), id), data)
  bumpTotals(batch, gid, totalsDelta(existing ?? null, draft), now)
  void batch.commit().catch(reportError)
}

/** Delete an expense (its author, or the group's owner) and take it back out of the totals. */
export function deleteGroupExpense(gid: string, expense: WithId<GroupExpense>) {
  const batch = writeBatch(db)
  batch.delete(doc(expenses(gid), expense.id))
  bumpTotals(batch, gid, totalsDelta(expense, null), Date.now())
  void batch.commit().catch(reportError)
}

