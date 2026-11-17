import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { categoriesQuery } from './categories'
import { reportError } from './core'
import { monthQuery } from './transactions'
import type { SyncStatus } from './types'

/**
 * offline: the browser says so. saving: unsynced local writes. synced: otherwise.
 * Watches the given month plus the categories, so a pending write elsewhere (another month) isn't seen.
 */
export function useSyncStatus(uid: string, ym: string): SyncStatus {
  const [online, setOnline] = useState(navigator.onLine)
  const [txPending, setTxPending] = useState(false)
  const [catPending, setCatPending] = useState(false)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  useEffect(
    // Same query as useMonth, so the SDK shares one watch target: no extra reads.
    () =>
      onSnapshot(monthQuery(uid, ym), { includeMetadataChanges: true }, (s) => setTxPending(s.metadata.hasPendingWrites), reportError),
    [uid, ym],
  )
  useEffect(
    // Same query as useCategories.
    () =>
      onSnapshot(categoriesQuery(uid), { includeMetadataChanges: true }, (s) => setCatPending(s.metadata.hasPendingWrites), reportError),
    [uid],
  )
  return !online ? 'offline' : txPending || catPending ? 'saving' : 'synced'
}
