import { useMemo } from 'react'
import { doc, getCountFromServer, getDocsFromServer, limit, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { occurrenceDate, scheduleChanged } from '@/lib/recurrence'
import { col, newId, remove, reportError, save } from './core'
import type { Recurring, RecurringDraft, WithId } from './types'
import { useDocs } from './use-docs'

/**
 * All recurring rules. Pass undefined to skip listening (e.g. before sign-in).
 * `serverOnly`: wait for the server's answer, so a stale cached `posted` is never acted on.
 */
export function useRecurring(uid: string | undefined, serverOnly = false) {
  const q = useMemo(() => (uid ? col(uid, 'recurring') : null), [uid])
  return useDocs(q, serverOnly)
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

/**
 * Create a rule (no `existing`) or edit one. Amount, category, note, end and paused apply to future
 * occurrences. Changing the schedule (frequency, interval, start date) ends the old rule at what it has
 * posted and starts a new one, so past transactions keep the dates they were posted with.
 */
export function saveRecurring(uid: string, draft: RecurringDraft, existing?: WithId<Recurring>) {
  const fresh = () => ({ ...draft, posted: 0, createdAt: Date.now() })
  if (!existing) {
    save(doc(col(uid, 'recurring'), newId(uid, 'recurring')), fresh())
    return
  }
  const ref = doc(col(uid, 'recurring'), existing.id)
  if (!scheduleChanged(existing, draft) || existing.posted === 0) {
    // `posted` is left out on purpose: the poster owns it, and a stale copy here would make it re-post.
    void updateDoc(ref, draft).catch(reportError)
    return
  }
  const batch = writeBatch(db)
  batch.update(ref, { end: { type: 'count', value: existing.posted } })
  batch.set(doc(col(uid, 'recurring'), newId(uid, 'recurring')), fresh())
  void batch.commit().catch(reportError)
}

const postedBy = (uid: string, ruleId: string) => query(col(uid, 'transactions'), where('recurringId', '==', ruleId))

/** How many transactions the rule has posted. Asks the server; rejects when offline. */
export async function countRecurringTransactions(uid: string, ruleId: string): Promise<number> {
  return (await getCountFromServer(postedBy(uid, ruleId))).data().count
}

/**
 * Delete a rule, and optionally the transactions it posted. Reads the server first, so it rejects offline
 * and nothing changes. The deletes then run detached, and the rule goes last, only after every batch is
 * acked: a failed batch leaves the rule in place to retry.
 */
export async function deleteRecurring(uid: string, ruleId: string, withTransactions: boolean): Promise<void> {
  const q = postedBy(uid, ruleId)
  const snap = await getDocsFromServer(withTransactions ? q : query(q, limit(1)))
  const commits: Promise<void>[] = []
  if (withTransactions) {
    for (let i = 0; i < snap.docs.length; i += 450) {
      const batch = writeBatch(db)
      for (const d of snap.docs.slice(i, i + 450)) batch.delete(d.ref)
      commits.push(batch.commit())
    }
  }
  void Promise.all(commits)
    .then(() => remove(doc(col(uid, 'recurring'), ruleId)))
    .catch(reportError)
}
