import { doc, getDocFromServer, getDocsFromServer, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Backup } from '@/lib/backup'
import { col, reportError, settingsRef } from './core'

/**
 * Everything the account holds, read from the server (a partial cache would give a silently incomplete backup).
 * One-off full read, so it may be awaited. Rejects when offline.
 */
export async function exportBackup(uid: string): Promise<Backup> {
  const [settings, categories, transactions, recurring, splits] = await Promise.all([
    getDocFromServer(settingsRef(uid)),
    getDocsFromServer(col(uid, 'categories')),
    getDocsFromServer(col(uid, 'transactions')),
    getDocsFromServer(col(uid, 'recurring')),
    getDocsFromServer(col(uid, 'splits')),
  ])
  return {
    version: 1,
    exportedAt: Date.now(),
    settings: settings.data() ?? null,
    categories: categories.docs.map((d) => ({ ...d.data(), id: d.id })),
    transactions: transactions.docs.map((d) => ({ ...d.data(), id: d.id })),
    recurring: recurring.docs.map((d) => ({ ...d.data(), id: d.id })),
    splits: splits.docs.map((d) => ({ ...d.data(), id: d.id })),
  }
}

// A batch holds at most 500 writes.
const BATCH = 500

/**
 * Write a validated backup back by its original ids, so importing twice changes nothing. Documents with the
 * same id are overwritten and nothing is deleted. Splits merge, so receipt links already on a live account survive.
 * Never awaited, like every write: offline, a batch only resolves once the server acks it.
 */
export function importBackup(uid: string, backup: Backup) {
  const writes: ((batch: ReturnType<typeof writeBatch>) => void)[] = []
  const { settings } = backup
  if (settings) writes.push((b) => b.set(settingsRef(uid), settings))
  for (const { id, ...d } of backup.categories) writes.push((b) => b.set(doc(col(uid, 'categories'), id), d))
  for (const { id, ...d } of backup.transactions) writes.push((b) => b.set(doc(col(uid, 'transactions'), id), d))
  for (const { id, ...d } of backup.recurring) writes.push((b) => b.set(doc(col(uid, 'recurring'), id), d))
  for (const { id, ...d } of backup.splits) writes.push((b) => b.set(doc(col(uid, 'splits'), id), d, { merge: true }))
  for (let i = 0; i < writes.length; i += BATCH) {
    const batch = writeBatch(db)
    for (const write of writes.slice(i, i + BATCH)) write(batch)
    void batch.commit().catch(reportError)
  }
}
