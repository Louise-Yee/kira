import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type FirestoreDataConverter,
  type Query,
  type QuerySnapshot,
  type SnapshotListenOptions,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GroupLog } from '@/lib/group-autolog'
import type { ClientDoc, Category, Recurring, Settings, Split, Transaction, WithId } from './types'

type Collections = { categories: Category; transactions: Transaction; recurring: Recurring; splits: Split; groupLogs: GroupLog }

export const converter = <T extends DocumentData>(): FirestoreDataConverter<T> => ({
  toFirestore: (data) => data,
  fromFirestore: (snap) => snap.data() as T,
})

export const col = <K extends keyof Collections>(uid: string, name: K): CollectionReference<Collections[K]> =>
  collection(db, 'users', uid, name).withConverter(converter<Collections[K]>())

export const settingsRef = (uid: string): DocumentReference<Settings> =>
  doc(db, 'users', uid, 'settings', 'main').withConverter(converter<Settings>())

export const clientRef = (uid: string): DocumentReference<ClientDoc> =>
  doc(db, 'users', uid, 'meta', 'client').withConverter(converter<ClientDoc>())

/** A fresh document id without a network round trip. */
export const newId = (uid: string, name: keyof Collections): string => doc(collection(db, 'users', uid, name)).id

export const reportError = (e: Error) => console.error('[firestore]', e)

// ponytail: fixed backoff (~15s in all); a create that takes longer to reach the server still needs a reopen.
const RETRY_MS = [500, 1000, 2000, 4000, 8000]

/**
 * onSnapshot that retries when it is refused. A listener whose rules look up a group that was just created on this
 * device is refused until that write reaches the server, and Firestore never retries a refused listener (#116, #119).
 * The error is reported only if it is still refused after the last retry.
 */
export function listen<T>(q: Query<T>, options: SnapshotListenOptions, onNext: (snap: QuerySnapshot<T>) => void): Unsubscribe {
  let stop: Unsubscribe = () => {}
  let timer: ReturnType<typeof setTimeout> | undefined
  const start = (attempt: number) => {
    stop = onSnapshot(q, options, onNext, (e) => {
      if (e.code !== 'permission-denied' || attempt >= RETRY_MS.length) return reportError(e)
      timer = setTimeout(() => start(attempt + 1), RETRY_MS[attempt])
    })
  }
  start(0)
  return () => {
    clearTimeout(timer)
    stop()
  }
}

// Writes are never awaited: offline, a pending write only resolves once the server acks it.
export function save<T extends DocumentData>(ref: DocumentReference<T>, data: T) {
  void setDoc(ref, data).catch(reportError)
}

/** The query's documents, leaving out soft-deleted ones (see `@/lib/deletion`). */
export const liveDocs = <T>(snap: QuerySnapshot<T>): WithId<T>[] =>
  snap.docs.filter((d) => d.get('deletedAt') == null).map((d) => ({ ...d.data(), id: d.id }))

/** The fields that soft-delete a document. `by` is set on documents other people share (groups, friends). */
export const deletion = (by?: string) => ({ deletedAt: Date.now(), ...(by ? { deletedBy: by } : {}) })

/** The fields that bring a soft-deleted document back. */
export const restoration = () => ({ deletedAt: deleteField(), deletedBy: deleteField() })

/** Soft-delete one document. Returns the undo. */
export function softDelete(ref: DocumentReference, by?: string) {
  void updateDoc(ref, deletion(by)).catch(reportError)
  return () => void updateDoc(ref, restoration()).catch(reportError)
}
