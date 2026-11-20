import { useEffect, useMemo } from 'react'
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { addDays, todayISO } from '@/lib/date'
import { logTxId, planSync, type GroupLog, type Synced } from '@/lib/group-autolog'
import { col, listen, reportError, save } from './core'
import { recentExpensesQuery } from './group-expenses'
import type { Group } from '@/lib/groups'
import type { WithId } from './types'
import { useDocs } from './use-docs'

/** Expenses older than this are not looked at, so the listener reads stay bounded however long the group has existed. */
const WINDOW_DAYS = 60

/** My auto-log settings, one per group (the document id is the group id). */
export function useGroupLogs(uid: string) {
  const q = useMemo(() => col(uid, 'groupLogs'), [uid])
  return useDocs(q)
}

/** Turn auto-log on or off for a group, or change its category. Never awaited. */
export function setGroupLog(uid: string, gid: string, log: GroupLog) {
  save(doc(col(uid, 'groupLogs'), gid), log)
}

const cacheKey = (uid: string, gid: string) => `kira.groupLog.${uid}.${gid}`

function readSynced(uid: string, gid: string): Synced {
  try {
    const raw = localStorage.getItem(cacheKey(uid, gid))
    return raw ? (JSON.parse(raw) as Synced) : {}
  } catch {
    return {}
  }
}

function writeSynced(uid: string, gid: string, synced: Synced) {
  try {
    localStorage.setItem(cacheKey(uid, gid), JSON.stringify(synced))
  } catch {
    // storage blocked: the next launch just writes the same transactions again
  }
}

/**
 * For every group with auto-log on, keeps my share of its expenses in my transactions: a new expense adds one, an
 * edit updates its amount and date, a delete (or taking me out of it) removes it. Runs while the app is open, from
 * the day auto-log was turned on, and only writes what changed (it remembers what it wrote on this device).
 * Each transaction is written on its own: one that I deleted by hand just fails quietly and doesn't block the rest.
 */
export function useGroupAutoLog(uid: string, groups: readonly WithId<Group>[] | undefined, logs: readonly (GroupLog & { id: string })[] | undefined) {
  const active = (logs ?? []).filter((l) => l.enabled && groups?.some((g) => g.id === l.id))
  // A stable key, so the listeners only restart when something about them changed.
  const key = JSON.stringify(active.map((l) => [l.id, l.categoryId, l.from]))
  useEffect(() => {
    const stops = active.map((log) => {
      const gid = log.id
      const since = [log.from, addDays(todayISO(), -WINDOW_DAYS)].reduce((a, b) => (a > b ? a : b))
      return listen(
        recentExpensesQuery(gid, since),
        // A snapshot from the local cache can be missing expenses, which would look like deletions: wait for the server's.
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.fromCache) return
          const expenses = snap.docs.map((d) => ({ id: d.id, date: d.data().date, title: d.data().title, shares: d.data().shares, updatedAt: d.data().updatedAt }))
          const plan = planSync(uid, expenses, readSynced(uid, gid), since)
          if (!plan.upserts.length && !plan.removals.length) return
          const now = Date.now()
          const ref = (expenseId: string) => doc(col(uid, 'transactions'), logTxId(gid, expenseId))
          const writes = [
            ...plan.upserts.map((u) =>
              u.isNew
                ? setDoc(ref(u.expenseId), {
                    kind: 'expense',
                    amount: u.amount,
                    categoryId: log.categoryId,
                    date: u.date,
                    note: u.title,
                    groupId: gid,
                    groupExpenseId: u.expenseId,
                    createdAt: now,
                    updatedAt: now,
                  })
                : updateDoc(ref(u.expenseId), { amount: u.amount, date: u.date, updatedAt: now }),
            ),
            ...plan.removals.map((id) => deleteDoc(ref(id))),
          ]
          // Remember it once the writes are through, whether or not each one worked (see above).
          void Promise.allSettled(writes).then((results) => {
            for (const r of results) if (r.status === 'rejected') reportError(r.reason instanceof Error ? r.reason : new Error('auto-log write failed'))
            writeSynced(uid, gid, plan.next)
          })
        },
      )
    })
    return () => stops.forEach((stop) => stop())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures what the listeners depend on
  }, [uid, key])
}
