import { useMemo } from 'react'
import { collection, doc, limit, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { settlementDelta, type Settlement, type Transfer } from '@/lib/group-ledger'
import { converter, reportError } from './core'
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

/** The payer undoes it, or the receiver says they didn't get it (only while pending): it goes, and the balances go back. */
export function takeBackSettlement(gid: string, s: WithId<Settlement>) {
  const batch = writeBatch(db)
  batch.delete(doc(settlements(gid), s.id))
  bumpTotals(batch, gid, settlementDelta(s, -1), Date.now())
  void batch.commit().catch(reportError)
}
