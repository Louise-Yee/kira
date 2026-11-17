import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { inTrendWindow, trendMonths } from '@/lib/date'
import { categoriesQuery } from './categories'
import { reportError } from './core'
import { monthQuery, monthsQuery } from './transactions'
import type { SyncStatus } from './types'

/**
 * offline: the browser says so. saving: unsynced local writes. synced: otherwise.
 * Watches the trend window, the viewed month when it is older than the window, and the categories.
 * Each is the same query the screens already listen to, so the SDK shares the watch: no extra reads.
 */
export function useSyncStatus(uid: string, ym: string, currentYm: string): SyncStatus {
  const [online, setOnline] = useState(navigator.onLine)
  const [winPending, setWinPending] = useState(false)
  const [monthPending, setMonthPending] = useState(false)
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
    () =>
      onSnapshot(
        monthsQuery(uid, trendMonths(currentYm)[0], currentYm),
        { includeMetadataChanges: true },
        (s) => setWinPending(s.metadata.hasPendingWrites),
        reportError,
      ),
    [uid, currentYm],
  )
  const older = !inTrendWindow(ym, currentYm)
  useEffect(
    () =>
      older
        ? onSnapshot(monthQuery(uid, ym), { includeMetadataChanges: true }, (s) => setMonthPending(s.metadata.hasPendingWrites), reportError)
        : undefined,
    [uid, ym, older],
  )
  useEffect(
    // Same query as useCategories.
    () =>
      onSnapshot(categoriesQuery(uid), { includeMetadataChanges: true }, (s) => setCatPending(s.metadata.hasPendingWrites), reportError),
    [uid],
  )
  return !online ? 'offline' : winPending || (older && monthPending) || catPending ? 'saving' : 'synced'
}
