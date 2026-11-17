import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type FirestoreDataConverter,
  type Query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { monthRange } from '@/lib/date'

export type Kind = 'expense' | 'income'

export type Category = {
  name: string
  kind: Kind
  /** Token name from index.css (`cat-1`..`cat-8`), not a hex value. */
  color: string
  /** Name from the category-icon list. */
  icon: string
  order: number
  archived: boolean
}

export type Transaction = {
  kind: Kind
  /** Integer sen. */
  amount: number
  categoryId: string
  /** Local YYYY-MM-DD. */
  date: string
  note: string
  recurringId?: string
  occurrence?: string
  splitId?: string
  /** Epoch ms (not serverTimestamp, which reads back null while a write is pending). */
  createdAt: number
  updatedAt: number
}

export type Settings = {
  currency: 'MYR'
  theme: 'system' | 'light' | 'dark'
  createdAt: number
  tngQr?: string
}

export type WithId<T> = T & { id: string }

type Collections = { categories: Category; transactions: Transaction }

const converter = <T extends DocumentData>(): FirestoreDataConverter<T> => ({
  toFirestore: (data) => data,
  fromFirestore: (snap) => snap.data() as T,
})

export const col = <K extends keyof Collections>(uid: string, name: K): CollectionReference<Collections[K]> =>
  collection(db, 'users', uid, name).withConverter(converter<Collections[K]>())

export const settingsRef = (uid: string): DocumentReference<Settings> =>
  doc(db, 'users', uid, 'settings', 'main').withConverter(converter<Settings>())

/** A fresh document id without a network round trip. */
export const newId = (uid: string, name: keyof Collections): string => doc(collection(db, 'users', uid, name)).id

const reportError = (e: Error) => console.error('[firestore]', e)

// Writes are never awaited: offline, a pending write only resolves once the server acks it.
export function save<T extends DocumentData>(ref: DocumentReference<T>, data: T) {
  void setDoc(ref, data).catch(reportError)
}

export function remove(ref: DocumentReference) {
  void deleteDoc(ref).catch(reportError)
}

/** Live query results; undefined until the first snapshot (cache-first, so instant when offline). */
function useDocs<T>(q: Query<T> | null): WithId<T>[] | undefined {
  const [state, setState] = useState<{ q: Query<T>; docs: WithId<T>[] }>()
  useEffect(() => {
    if (!q) return
    return onSnapshot(
      q,
      (snap) => setState({ q, docs: snap.docs.map((d) => ({ ...d.data(), id: d.id })) }),
      reportError,
    )
  }, [q])
  // Ignore a snapshot that belongs to a previous query (e.g. the month just switched).
  return state?.q === q ? state.docs : undefined
}

export function useCategories(uid: string) {
  const q = useMemo(() => query(col(uid, 'categories'), orderBy('order')), [uid])
  return useDocs(q)
}

const monthQuery = (uid: string, ym: string) => {
  const { start, end } = monthRange(ym)
  return query(col(uid, 'transactions'), where('date', '>=', start), where('date', '<', end), orderBy('date', 'desc'))
}

/** Transactions of one month, newest first. */
export function useMonth(uid: string, ym: string) {
  const q = useMemo(() => monthQuery(uid, ym), [uid, ym])
  return useDocs(q)
}

/** undefined = loading, null = no settings document yet. */
export function useSettings(uid: string) {
  const [state, setState] = useState<{ uid: string; settings: Settings | null }>()
  useEffect(
    () => onSnapshot(settingsRef(uid), (s) => setState({ uid, settings: s.data() ?? null }), reportError),
    [uid],
  )
  return state?.uid === uid ? state.settings : undefined
}

export type SyncStatus = 'offline' | 'saving' | 'synced'

/**
 * offline: the browser says so. saving: unsynced local writes. synced: otherwise.
 * Only watches the given month, so a pending write in another month isn't seen.
 */
export function useSyncStatus(uid: string, ym: string): SyncStatus {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(false)
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
      onSnapshot(monthQuery(uid, ym), { includeMetadataChanges: true }, (s) => setPending(s.metadata.hasPendingWrites), reportError),
    [uid, ym],
  )
  return !online ? 'offline' : pending ? 'saving' : 'synced'
}
