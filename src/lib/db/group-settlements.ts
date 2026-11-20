import { useEffect, useMemo, useState } from 'react'
import { collection, doc, limit, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { settlementDelta, type Settlement, type Transfer } from '@/lib/group-ledger'
import { converter, deletion, listen, liveDocs, reportError, restoration } from './core'
import type { Me } from './friends'
import { bumpTotals } from './group-expenses'
import type { WithId } from './types'
import { useDocs } from './use-docs'

const settlements = (gid: string) => collection(db, 'groups', gid, 'settlements').withConverter(converter<Settlement>())

/** Settlements dated `since` or later, newest first. */
export function useRecentSettlements(gid: string, since: string) {
  const q = useMemo(() => query(settlements(gid), where('date', '>=', since), orderBy('date', 'desc')), [gid, since])
  return useDocs(q)
}

/** Up to `count` settlements dated before `before`, newest first. `enabled` false opens no listener. */
export function useOlderSettlements(gid: string, before: string, count: number, enabled: boolean) {
  const q = useMemo(
    () => (enabled ? query(settlements(gid), where('date', '<', before), orderBy('date', 'desc'), limit(count)) : null),
    [gid, before, count, enabled],
  )
  return useDocs(q)
}

/** The ones still waiting for the receiver to confirm, however old (there are only ever a few). */
export function usePendingSettlements(gid: string) {
  const q = useMemo(() => query(settlements(gid), where('status', '==', 'pending')), [gid])
  return useDocs(q)
}

/** Payments marked "Not received" that the payer hasn't dismissed yet (only ever a few). */
export function useRejectedSettlements(gid: string) {
  const q = useMemo(() => query(settlements(gid), where('status', '==', 'rejected')), [gid])
  return useDocs(q)
}

/** A payment that needs me, with the group it belongs to. */
export type PendingForMe = WithId<Settlement> & { gid: string }

/**
 * Payments in any of my groups that need me: made to me and waiting for me to confirm, or mine that were marked "Not
 * received". For the inbox and the tab's dot. Two small listeners per group (people are in a handful of groups).
 */
export function usePendingForMe(uid: string, groupIds: readonly string[]): PendingForMe[] {
  const key = groupIds.join(',')
  const [byGroup, setByGroup] = useState<Record<string, WithId<Settlement>[]>>({})
  useEffect(() => {
    const stops = (key ? key.split(',') : []).flatMap((gid) =>
      [
        [`${gid} to`, query(settlements(gid), where('to', '==', uid), where('status', '==', 'pending'))] as const,
        [`${gid} from`, query(settlements(gid), where('from', '==', uid), where('status', '==', 'rejected'))] as const,
      ].map(([slot, q]) => listen(q, {}, (snap) => setByGroup((m) => ({ ...m, [slot]: liveDocs(snap) })))),
    )
    return () => stops.forEach((stop) => stop())
  }, [uid, key])
  return groupIds.flatMap((gid) => [...(byGroup[`${gid} to`] ?? []), ...(byGroup[`${gid} from`] ?? [])].map((s) => ({ ...s, gid })))
}

/**
 * Record that I paid `t.to` back. It counts in the balances straight away (so the suggestions update), and waits for
 * them to confirm. One batch, never awaited.
 */
export function settleUp(me: Me, gid: string, t: Transfer, date: string) {
  const now = Date.now()
  const batch = writeBatch(db)
  const s: Settlement = { from: t.from, to: t.to, amount: t.amount, date, status: 'pending', createdBy: me.uid, createdAt: now }
  batch.set(doc(settlements(gid)), s)
  bumpTotals(batch, gid, settlementDelta(t, 1), now)
  void batch.commit().catch(reportError)
}

/** The receiver says they got it. The balances already counted it, so only the status changes. */
export function confirmSettlement(gid: string, s: WithId<Settlement>) {
  void updateDoc(doc(settlements(gid), s.id), { status: 'confirmed', confirmedAt: Date.now() }).catch(reportError)
}

/**
 * The receiver says they didn't get it (only while pending): the balances go back, and it stays as "rejected" so the
 * payer is told, until they dismiss it.
 */
export function rejectSettlement(gid: string, s: WithId<Settlement>) {
  const now = Date.now()
  const batch = writeBatch(db)
  batch.update(doc(settlements(gid), s.id), { status: 'rejected', rejectedAt: now })
  bumpTotals(batch, gid, settlementDelta(s, -1), now)
  void batch.commit().catch(reportError)
}

/** The payer has seen that their payment was rejected. It no longer counts, so it just goes (soft-deleted). */
export function dismissSettlement(me: Me, gid: string, s: WithId<Settlement>) {
  void updateDoc(doc(settlements(gid), s.id), deletion(me.uid)).catch(reportError)
}

// ponytail: a taken-back payment keeps status 'pending', so the small pending listeners keep reading it; give it its
// own status if that ever adds up.
/** The payer undoes it (only while pending): it goes (soft-deleted), and the balances go back. Returns the undo. */
export function takeBackSettlement(me: Me, gid: string, s: WithId<Settlement>) {
  const move = (sign: 1 | -1, fields: ReturnType<typeof deletion> | ReturnType<typeof restoration>) => {
    const batch = writeBatch(db)
    batch.update(doc(settlements(gid), s.id), fields)
    bumpTotals(batch, gid, settlementDelta(s, sign), Date.now())
    void batch.commit().catch(reportError)
  }
  move(-1, deletion(me.uid))
  return () => move(1, restoration())
}
