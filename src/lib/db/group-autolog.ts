import { useEffect, useMemo } from 'react'
import { deleteDoc, doc, getDocFromServer, setDoc, updateDoc } from 'firebase/firestore'
import { addDays, todayISO } from '@/lib/date'
import { logTxId, planSync, type GroupLog, type Synced } from '@/lib/group-autolog'
import { col, listen, liveDocs, reportError, save } from './core'
import { recentExpensesQuery } from './group-expenses'
import type { Group } from '@/lib/groups'
import type { Category } from './types'
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

/**
 * Auto-log is on by default (#113): a group I have no setting for gets one, on from today under "Other" (or my first
 * expense category), so nothing from before suddenly lands in my transactions. The server is asked first, so a device
 * whose cache hasn't loaded a setting yet never overwrites one I turned off; offline, it waits for the next launch.
 */
export function useDefaultGroupLogs(
  uid: string,
  groups: readonly WithId<Group>[] | undefined,
  logs: readonly { id: string }[] | undefined,
  categories: readonly WithId<Category>[] | undefined,
) {
  const missing = groups && logs ? groups.filter((g) => !logs.some((l) => l.id === g.id)).map((g) => g.id) : []
  const usable = (categories ?? []).filter((c) => c.kind === 'expense' && !c.archived)
  const categoryId = (usable.find((c) => c.name === 'Other') ?? usable[0])?.id
  const key = missing.join(',')
  useEffect(() => {
    if (!key || !categoryId) return
    let live = true
    for (const gid of key.split(',')) {
      getDocFromServer(doc(col(uid, 'groupLogs'), gid)).then(
        (s) => live && !s.exists() && setGroupLog(uid, gid, { enabled: true, categoryId, from: todayISO(), updatedAt: Date.now() }),
        () => {}, // offline: try again next launch
      )
    }
    return () => {
      live = false
    }
  }, [uid, key, categoryId])
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
          // A deleted expense counts as removed, so its auto-logged transaction goes too.
          const expenses = liveDocs(snap).map((e) => ({ id: e.id, date: e.date, title: e.title, shares: e.shares, updatedAt: e.updatedAt }))
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
