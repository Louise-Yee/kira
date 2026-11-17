import { useMemo } from 'react'
import { doc, orderBy, query, where } from 'firebase/firestore'
import { monthRange } from '@/lib/date'
import { col, newId, remove, save } from './core'
import type { Transaction, TransactionDraft, WithId } from './types'
import { useDocs } from './use-docs'

export const monthQuery = (uid: string, ym: string) => {
  const { start, end } = monthRange(ym)
  return query(col(uid, 'transactions'), where('date', '>=', start), where('date', '<', end), orderBy('date', 'desc'))
}

/** Transactions of one month, newest first. */
export function useMonth(uid: string, ym: string) {
  const q = useMemo(() => monthQuery(uid, ym), [uid, ym])
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
