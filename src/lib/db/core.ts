import {
  collection,
  deleteDoc,
  doc,
  setDoc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type FirestoreDataConverter,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Category, Settings, Transaction } from './types'

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

export const reportError = (e: Error) => console.error('[firestore]', e)

// Writes are never awaited: offline, a pending write only resolves once the server acks it.
export function save<T extends DocumentData>(ref: DocumentReference<T>, data: T) {
  void setDoc(ref, data).catch(reportError)
}

export function remove(ref: DocumentReference) {
  void deleteDoc(ref).catch(reportError)
}
