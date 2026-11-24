import { useMemo } from 'react'
import { collection, deleteField, doc, limit, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toHome } from '@/lib/money'
import { buildReceipt } from '@/lib/receipt-data'
import { computeForm, resolveItems, type SplitItem } from '@/lib/split'
import { col, newId, reportError, softDelete } from './core'
import type { PublicReceipt, Split, SplitDraft, WithId } from './types'
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
 * A foreign split keeps its amounts in that currency; my expense is in RM at the split's rate, with the original.
 */
export function saveSplit(uid: string, draft: SplitDraft, existing?: WithId<Split>) {
  const id = existing?.id ?? newId(uid, 'splits')
  const now = Date.now()
  const createdAt = existing?.createdAt ?? now
  const { form } = draft
  const { shares } = computeForm(form)
  const fx = draft.currency && draft.rate ? { currency: draft.currency, rate: draft.rate } : null
  const mine = (fx ? toHome(shares[0].total, fx.currency, fx.rate) : null) ?? { amount: shares[0].total }
  const txRef = doc(col(uid, 'transactions'), expenseId(id))

  const data = {
    title: draft.title,
    date: draft.date,
    mode: form.mode,
    ...(fx ?? {}),
    people: form.people,
    // Only friends still on the split; absent when there are none (Firestore rejects undefined).
    ...(Object.keys(form.friends ?? {}).length ? { friends: form.friends } : {}),
    items: resolveItems(form).map(cleanItem),
    charges: form.mode === 'exact' ? ({ type: 'percent', value: 0 } as const) : form.charges,
    shares,
  }

  const batch = writeBatch(db)
  // Receipt links follow the split: refresh each one, but drop it if that position now holds someone else.
  const shareIds: Record<string, string> = {}
  // Paid ticks follow the person too, and are dropped if that position now holds someone else.
  const paid: Record<string, true> = {}
  for (const i of Object.keys(existing?.paid ?? {})) {
    if (form.people[Number(i)] !== undefined && form.people[Number(i)] === existing?.people[Number(i)]) paid[i] = true
  }
  for (const [i, shareId] of Object.entries(existing?.shareIds ?? {})) {
    const person = Number(i)
    if (form.people[person] !== undefined && form.people[person] === existing?.people[person]) {
      shareIds[i] = shareId
      batch.update(shareRef(shareId), { receipt: buildReceipt(data, person), updatedAt: now })
    } else {
      batch.delete(shareRef(shareId))
    }
  }
  batch.set(doc(col(uid, 'splits'), id), {
    ...data,
    categoryId: draft.categoryId,
    expenseTxId: mine.amount > 0 ? txRef.id : null,
    ...(Object.keys(shareIds).length ? { shareIds } : {}),
    ...(Object.keys(paid).length ? { paid } : {}),
    createdAt,
    updatedAt: now,
  })
  if (mine.amount > 0) {
    batch.set(txRef, {
      kind: 'expense',
      ...mine,
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

/** Tick (or untick) that one person has paid me back. Never awaited, like every write. */
export function setPaid(uid: string, split: WithId<Split>, person: number, paid: boolean) {
  void updateDoc(doc(col(uid, 'splits'), split.id), { [`paid.${person}`]: paid ? true : deleteField(), updatedAt: Date.now() }).catch(reportError)
}

const shareRef = (id: string) => doc(db, 'shares', id)

/**
 * The receipt link id for one person of a split, created on first use (the same id every time after).
 * Returns at once, before the write reaches the server, so a share sheet can open straight from the tap.
 */
export function createShare(uid: string, split: WithId<Split>, person: number): string {
  const existing = split.shareIds?.[person]
  if (existing) return existing
  const id = doc(collection(db, 'shares')).id
  const now = Date.now()
  const batch = writeBatch(db)
  const receipt: PublicReceipt = { uid, splitId: split.id, person, receipt: buildReceipt(split, person), createdAt: now, updatedAt: now }
  batch.set(shareRef(id), receipt)
  batch.update(doc(col(uid, 'splits'), split.id), { [`shareIds.${person}`]: id })
  void batch.commit().catch(reportError)
  return id
}

/**
 * Soft-delete a split, the expense it created and its receipt links (a deleted link stops opening). Returns the undo.
 * Each on its own, not one batch: an update to a doc that is already gone (an expense removed by hand in an older
 * version) would fail the whole batch.
 */
export function deleteSplit(uid: string, split: WithId<Split>) {
  const undos = [
    doc(col(uid, 'splits'), split.id),
    ...(split.expenseTxId ? [doc(col(uid, 'transactions'), split.expenseTxId)] : []),
    ...Object.values(split.shareIds ?? {}).map(shareRef),
  ].map((ref) => softDelete(ref))
  return () => undos.forEach((undo) => undo())
}
