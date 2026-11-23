import { useMemo } from 'react'
import { deleteField, doc, getDocsFromServer, limit, query, updateDoc, where, writeBatch, type DocumentReference } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toSen } from '@/lib/money'
import { occurrenceDate, scheduleChanged } from '@/lib/recurrence'
import { col, deletion, liveDocs, newId, reportError, restoration, save } from './core'
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
 * A foreign rule converts at `rate` (the latest known), not the rate saved on the rule.
 * Never awaited: offline, a batch only resolves once the server acks it.
 */
export function postOccurrences(uid: string, ruleId: string, rule: Recurring, indices: number[], rate?: number) {
  const now = Date.now()
  const o = rule.original
  const money = o ? { amount: toSen(o.amount, o.currency, rate ?? o.rate), original: { ...o, rate: rate ?? o.rate } } : { amount: rule.amount }
  for (let i = 0; i < indices.length; i += CHUNK) {
    const part = indices.slice(i, i + CHUNK)
    const batch = writeBatch(db)
    for (const n of part) {
      batch.set(doc(col(uid, 'transactions'), `${ruleId}_${n}`), {
        kind: rule.kind,
        ...money,
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
    // A rule switched back to RM drops its original (updateDoc keeps fields the draft leaves out).
    void updateDoc(ref, { ...draft, original: draft.original ?? deleteField() }).catch(reportError)
    return
  }
  const batch = writeBatch(db)
  batch.update(ref, { end: { type: 'count', value: existing.posted } })
  batch.set(doc(col(uid, 'recurring'), newId(uid, 'recurring')), fresh())
  void batch.commit().catch(reportError)
}

const postedBy = (uid: string, ruleId: string) => query(col(uid, 'transactions'), where('recurringId', '==', ruleId))

/**
 * How many (not deleted) transactions the rule has posted. Asks the server; rejects when offline.
 * Reads them all: a count query can't leave out soft-deleted ones.
 */
export async function countRecurringTransactions(uid: string, ruleId: string): Promise<number> {
  return liveDocs(await getDocsFromServer(postedBy(uid, ruleId))).length
}

/** Apply `fields` to every doc, at most 450 writes a batch. */
function updateAll(refs: DocumentReference[], fields: ReturnType<typeof deletion> | ReturnType<typeof restoration>) {
  const commits: Promise<void>[] = []
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + 450)) batch.update(ref, fields)
    commits.push(batch.commit())
  }
  return Promise.all(commits)
}

/**
 * Soft-delete a rule, and optionally the transactions it posted. Reads the server first, so it rejects offline
 * and nothing changes. The writes then run detached, and the rule goes last, only after every batch is
 * acked: a failed batch leaves the rule in place to retry. Resolves to the undo, which brings back the same ones.
 */
export async function deleteRecurring(uid: string, ruleId: string, withTransactions: boolean): Promise<() => void> {
  const q = postedBy(uid, ruleId)
  const snap = await getDocsFromServer(withTransactions ? q : query(q, limit(1)))
  // Ones already deleted on their own stay that way, with their own date.
  const txs = withTransactions ? liveDocs(snap).map((t) => doc(col(uid, 'transactions'), t.id)) : []
  const rule = doc(col(uid, 'recurring'), ruleId)
  void updateAll(txs, deletion())
    .then(() => updateDoc(rule, deletion()))
    .catch(reportError)
  return () => void updateAll([rule, ...txs], restoration()).catch(reportError)
}
