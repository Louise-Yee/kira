import { useMemo } from 'react'
import { doc, orderBy, query, where } from 'firebase/firestore'
import { monthRange, monthsRange } from '@/lib/date'
import { col, newId, remove, save } from './core'
import type { Transaction, TransactionDraft, WithId } from './types'
import { useDocs } from './use-docs'

export const monthQuery = (uid: string, ym: string) => {
  const { start, end } = monthRange(ym)
  return query(col(uid, 'transactions'), where('date', '>=', start), where('date', '<', end), orderBy('date', 'desc'))
}

export const monthsQuery = (uid: string, fromYm: string, toYm: string) => {
  const { start, end } = monthsRange(fromYm, toYm)
  return query(col(uid, 'transactions'), where('date', '>=', start), where('date', '<', end), orderBy('date', 'desc'))
}

/** Transactions of one month, newest first. `enabled: false` skips the listener (undefined until enabled). */
export function useMonth(uid: string, ym: string, enabled = true) {
  const q = useMemo(() => (enabled ? monthQuery(uid, ym) : null), [uid, ym, enabled])
  return useDocs(q)
}

/** Transactions of the whole months fromYm..toYm, newest first, through one listener. */
export function useMonths(uid: string, fromYm: string, toYm: string) {
  const q = useMemo(() => monthsQuery(uid, fromYm, toYm), [uid, fromYm, toYm])
  return useDocs(q)
}

/** Create (no `existing`) or update a transaction. Keeps createdAt and the recurring/split links when editing. */
export function saveTransaction(uid: string, draft: TransactionDraft, existing?: WithId<Transaction>) {
  const now = Date.now()
  const id = existing?.id ?? newId(uid, 'transactions')
  save(doc(col(uid, 'transactions'), id), {
    ...draft,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    // Firestore rejects undefined fields, so only carry links that exist.
    ...(existing?.recurringId ? { recurringId: existing.recurringId } : {}),
    ...(existing?.occurrence ? { occurrence: existing.occurrence } : {}),
    ...(existing?.splitId ? { splitId: existing.splitId } : {}),
  })
}

export const deleteTransaction = (uid: string, id: string) => remove(doc(col(uid, 'transactions'), id))
