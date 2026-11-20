import { useMemo } from 'react'
import { collection, doc, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { friendshipId, sortedUids, type Friendship } from '@/lib/friends'
import { converter, reportError, softDelete } from './core'
import type { DirectoryEntry, WithId } from './types'
import { useDocs } from './use-docs'

const friendships = collection(db, 'friendships').withConverter(converter<Friendship>())
const ref = (id: string) => doc(friendships, id)

/** Who I am, as friends see me. */
export type Me = { uid: string; displayName: string | null; photoURL: string | null }

const nameOf = (u: { displayName: string | null; photoURL: string | null }) => ({ displayName: u.displayName ?? '', photoURL: u.photoURL })

/** My friends and the requests to and from me (a small set, so the listener is unbounded). */
export function useFriendships(uid: string) {
  const q = useMemo(() => query(friendships, where('uids', 'array-contains', uid)), [uid])
  return useDocs(q)
}

/** Ask `to` to be friends. Never awaited, like every write. Overwrites a deleted friendship between the two. */
export function sendFriendRequest(me: Me, to: DirectoryEntry) {
  const now = Date.now()
  const request: Friendship = {
    uids: sortedUids(me.uid, to.uid),
    requester: me.uid,
    status: 'pending',
    names: { [me.uid]: nameOf(me), [to.uid]: nameOf(to) },
    createdAt: now,
    updatedAt: now,
  }
  void setDoc(ref(friendshipId(me.uid, to.uid)), request).catch(reportError)
}

/** Accept a request sent to me; this also refreshes my own name on it. */
export function acceptFriendRequest(me: Me, f: WithId<Friendship>) {
  void updateDoc(ref(f.id), { status: 'accepted', [`names.${me.uid}`]: nameOf(me), updatedAt: Date.now() }).catch(reportError)
}

/** Decline a request, cancel one I sent, or unfriend: all soft-delete the document. */
export function removeFriendship(me: Me, id: string) {
  softDelete(ref(id), me.uid)
}
