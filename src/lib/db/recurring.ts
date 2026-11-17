import { useMemo } from 'react'
import { doc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { occurrenceDate } from '@/lib/recurrence'
import { col, reportError } from './core'
import type { Recurring } from './types'
import { useDocs } from './use-docs'

/** All recurring rules. Pass undefined to skip listening (e.g. before sign-in). */
export function useRecurring(uid: string | undefined) {
  const q = useMemo(() => (uid ? col(uid, 'recurring') : null), [uid])
  return useDocs(q)
}

// A batch holds 500 writes: up to 499 transactions plus the rule's `posted` update.
const CHUNK = 499

/**
 * Create the transactions for occurrences `indices` (ascending, contiguous from `rule.posted`) and advance `posted`.
 * IDs are `{ruleId}_{n}`, so two devices posting the same occurrence write the same document.
 * Never awaited: offline, a batch only resolves once the server acks it.
 */
export function postOccurrences(uid: string, ruleId: string, rule: Recurring, indices: number[]) {
  const now = Date.now()
  for (let i = 0; i < indices.length; i += CHUNK) {
    const part = indices.slice(i, i + CHUNK)
    const batch = writeBatch(db)
    for (const n of part) {
      batch.set(doc(col(uid, 'transactions'), `${ruleId}_${n}`), {
        kind: rule.kind,
        amount: rule.amount,
        categoryId: rule.categoryId,
        note: rule.note,
        date: occurrenceDate(rule, n),
        recurringId: ruleId,
        occurrence: n,
        createdAt: now,
        updatedAt: now,
      })
    }
    batch.update(doc(col(uid, 'recurring'), ruleId), { posted: part[part.length - 1] + 1 })
    void batch.commit().catch(reportError)
  }
}
