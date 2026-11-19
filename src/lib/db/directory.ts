import { useEffect } from 'react'
import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { normalizeEmail } from '@/lib/email'
import { reportError, settingsRef } from './core'
import type { DirectoryEntry } from './types'

const entryRef = (email: string) => doc(db, 'directory', email)
const cacheKey = (uid: string) => `kira.directory.${uid}`

function readCache(uid: string): string | null {
  try {
    return localStorage.getItem(cacheKey(uid))
  } catch {
    return null
  }
}

function writeCache(uid: string, state: string) {
  try {
    localStorage.setItem(cacheKey(uid), state)
  } catch {
    // storage blocked: we just write again next launch
  }
}

/**
 * Keeps `directory/{email}` in line with the account so friends can find it from their contacts.
 * Published unless the user turned `discoverable` off in settings, which removes it.
 * Only verified emails are published (the rules check this too). Writes only when something changed.
 */
export function useDirectoryPublisher(user: User | null | undefined) {
  const uid = user?.uid
  const email = normalizeEmail(user?.email)
  const verified = user?.emailVerified
  const displayName = user?.displayName ?? ''
  const photoURL = user?.photoURL ?? null
  useEffect(() => {
    if (!uid || !email || !verified) return
    return onSnapshot(
      settingsRef(uid),
      (s) => {
        const on = s.data()?.discoverable !== false
        const entry: DirectoryEntry = { uid, displayName, photoURL }
        const state = on ? JSON.stringify(entry) : 'off'
        if (readCache(uid) === state) return
        void (on ? setDoc(entryRef(email), entry) : deleteDoc(entryRef(email)))
          .then(() => writeCache(uid, state))
          .catch(reportError)
      },
      reportError,
    )
  }, [uid, email, verified, displayName, photoURL])
}

/**
 * Registered, discoverable users among these emails. A directory can't be listed, only read one email at a time,
 * so this costs one read per email. Emails that aren't found, and `ownUid`, are left out.
 */
export async function findByEmails(emails: string[], ownUid: string): Promise<(DirectoryEntry & { email: string })[]> {
  const unique = [...new Set(emails.map(normalizeEmail).filter((e): e is string => e !== null))]
  const found = await Promise.all(
    unique.map(async (email) => {
      const entry = (await getDoc(entryRef(email))).data() as DirectoryEntry | undefined
      return entry && entry.uid !== ownUid ? { ...entry, email } : null
    }),
  )
  return found.filter((f) => f !== null)
}
