import { useMemo } from 'react'
import { doc, limit, orderBy, query, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { computeForm, resolveItems, type SplitItem } from '@/lib/split'
import { col, newId, reportError } from './core'
import type { Split, SplitDraft, WithId } from './types'
import { useDocs } from './use-docs'

/** Older splits load this many at a time, so reads stay bounded. */
export const SPLITS_PAGE = 30

/** Splits dated `since` or later, newest first. The window is short, so it has no limit. */
export function useRecentSplits(uid: string, since: string) {
  const q = useMemo(() => query(col(uid, 'splits'), where('date', '>=', since), orderBy('date', 'desc')), [uid, since])
  return useDocs(q)
}

/** Up to `count` splits dated before `before`, newest first. `enabled` false opens no listener. */
export function useOlderSplits(uid: string, before: string, count: number, enabled: boolean) {
  const q = useMemo(
    () => (enabled ? query(col(uid, 'splits'), where('date', '<', before), orderBy('date', 'desc'), limit(count)) : null),
    [uid, before, count, enabled],
  )
  return useDocs(q)
}

const expenseId = (splitId: string) => `${splitId}_me`

// Firestore rejects undefined fields, so an empty item name is left out.
const cleanItem = (item: SplitItem): SplitItem => ({
  ...(item.name?.trim() ? { name: item.name.trim() } : {}),
  amount: item.amount,
  people: item.people,
})

/**
 * Create (no `existing`) or update a split, and keep my own share in sync as an expense (`{splitId}_me`).
 * One batch, never awaited. Shares are computed here and stored as fixed values.
 * My share of 0 (I'm on no item) creates no expense and removes a previous one.
 */
export function saveSplit(uid: string, draft: SplitDraft, existing?: WithId<Split>) {
  const id = existing?.id ?? newId(uid, 'splits')
  const now = Date.now()
  const createdAt = existing?.createdAt ?? now
  const { form } = draft
  const { shares } = computeForm(form)
  const mine = shares[0].total
  const txRef = doc(col(uid, 'transactions'), expenseId(id))

  const batch = writeBatch(db)
  batch.set(doc(col(uid, 'splits'), id), {
    title: draft.title,
    date: draft.date,
    mode: form.mode,
    people: form.people,
    items: resolveItems(form).map(cleanItem),
    charges: form.mode === 'exact' ? { type: 'percent', value: 0 } : form.charges,
    shares,
    categoryId: draft.categoryId,
    expenseTxId: mine > 0 ? txRef.id : null,
    createdAt,
    updatedAt: now,
  })
  if (mine > 0) {
    batch.set(txRef, {
      kind: 'expense',
      amount: mine,
      categoryId: draft.categoryId,
      date: draft.date,
      note: draft.title,
      splitId: id,
      createdAt,
      updatedAt: now,
    })
  } else if (existing?.expenseTxId) {
    batch.delete(txRef)
  }
  void batch.commit().catch(reportError)
}

/** Delete a split and the expense it created, together. */
export function deleteSplit(uid: string, id: string) {
  const batch = writeBatch(db)
  batch.delete(doc(col(uid, 'splits'), id))
  batch.delete(doc(col(uid, 'transactions'), expenseId(id)))
  void batch.commit().catch(reportError)
}
