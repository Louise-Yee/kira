import { useEffect, useMemo, useState } from 'react'
import { arrayRemove, arrayUnion, collection, deleteField, doc, getDoc, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import type { FirebaseError } from 'firebase/app'
import { db } from '@/lib/firebase'
import { INVITE_MS, cleanGroupName, type Group, type Invite } from '@/lib/groups'
import { HOME } from '@/lib/money'
import { converter, deletion, reportError } from './core'
import type { Me } from './friends'
import type { WithId } from './types'
import { useDocs } from './use-docs'

const groups = collection(db, 'groups').withConverter(converter<Group>())
const invites = collection(db, 'invites').withConverter(converter<Invite>())
export const groupRef = (id: string) => doc(groups, id)
const inviteRef = (id: string) => doc(invites, id)

const nameOf = (me: Me) => me.displayName ?? ''

/** The groups I'm in (a small set, so the listener is unbounded). */
export function useGroups(uid: string) {
  const q = useMemo(() => query(groups, where('memberUids', 'array-contains', uid)), [uid])
  return useDocs(q)
}

/** Groups a friend invited me to, waiting for me to join or decline. */
export function useGroupInvites(uid: string) {
  const q = useMemo(() => query(groups, where('invitedUids', 'array-contains', uid)), [uid])
  return useDocs(q)
}

/** Invite a friend into a group (any member). They see it in their People inbox and join or decline. */
export function inviteToGroup(me: Me, gid: string, friend: { uid: string; displayName: string; photoURL: string | null }) {
  const now = Date.now()
  void updateDoc(groupRef(gid), {
    invitedUids: arrayUnion(friend.uid),
    [`invited.${friend.uid}`]: { displayName: friend.displayName, photoURL: friend.photoURL, by: me.uid, at: now },
    updatedAt: now,
  }).catch(reportError)
}

/** Take an invite back (whoever sent it, or the owner), or decline one sent to me (`uid` is mine). */
export function cancelGroupInvite(gid: string, uid: string) {
  void updateDoc(groupRef(gid), { invitedUids: arrayRemove(uid), [`invited.${uid}`]: deleteField(), updatedAt: Date.now() }).catch(reportError)
}

/** Join a group I was invited to. */
export function acceptGroupInvite(me: Me, group: WithId<Group>) {
  const now = Date.now()
  void updateDoc(groupRef(group.id), {
    memberUids: arrayUnion(me.uid),
    [`members.${me.uid}`]: { displayName: nameOf(me), photoURL: me.photoURL, joinedAt: now, invitedBy: group.invited?.[me.uid]?.by ?? '' },
    invitedUids: arrayRemove(me.uid),
    [`invited.${me.uid}`]: deleteField(),
    updatedAt: now,
  }).catch(reportError)
}

/** A group's invite by link token: undefined while loading, null if it doesn't exist or can't be read. */
export function useInvite(token: string) {
  const [state, setState] = useState<{ token: string; invite: WithId<Invite> | null }>()
  useEffect(() => {
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    // Right after signing in, the first read can go out before the database has the sign-in and be refused (#115),
    // so a refusal is tried again a few times before the link counts as not working.
    const read = (triesLeft: number) =>
      getDoc(inviteRef(token)).then(
        (s) => live && setState({ token, invite: s.exists() ? { ...s.data(), id: s.id } : null }),
        (e: FirebaseError) => {
          if (!live) return
          if (e.code === 'permission-denied' && triesLeft > 0) timer = setTimeout(() => read(triesLeft - 1), 1000)
          else setState({ token, invite: null })
        },
      )
    void read(3)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [token])
  return state?.token === token ? state.invite : undefined
}

/** Create a group with its first invite link. Returns the new group id at once, before the write reaches the server. */
/** Create a group in `currency`, fixed for good (RM leaves the field out, like groups made before currencies). */
export function createGroup(me: Me, name: string, currency: string): string {
  const now = Date.now()
  const clean = cleanGroupName(name)
  const gid = doc(groups).id
  const token = doc(invites).id
  const batch = writeBatch(db)
  batch.set(groupRef(gid), {
    name: clean,
    ...(currency !== HOME ? { currency } : {}),
    ownerUid: me.uid,
    memberUids: [me.uid],
    members: { [me.uid]: { displayName: nameOf(me), photoURL: me.photoURL, joinedAt: now } },
    inviteId: token,
    inviteExpiresAt: now + INVITE_MS,
    createdAt: now,
    updatedAt: now,
  })
  batch.set(inviteRef(token), {
    gid,
    groupName: clean,
    ownerName: nameOf(me),
    ownerUid: me.uid,
    expiresAt: now + INVITE_MS,
    revoked: false,
    createdAt: now,
  })
  void batch.commit().catch(reportError)
  return gid
}

/** Rename a group (owner only); the invite link shows the new name too. */
export function renameGroup(group: WithId<Group>, name: string) {
  const batch = writeBatch(db)
  const clean = cleanGroupName(name)
  batch.update(groupRef(group.id), { name: clean, updatedAt: Date.now() })
  if (group.inviteId) batch.update(inviteRef(group.inviteId), { groupName: clean })
  void batch.commit().catch(reportError)
}

/** Replace the invite link with a fresh one that works for another week; the old one stops working. Owner only. */
export function newInvite(me: Me, group: WithId<Group>) {
  const now = Date.now()
  const token = doc(invites).id
  const batch = writeBatch(db)
  if (group.inviteId) batch.update(inviteRef(group.inviteId), { revoked: true })
  batch.set(inviteRef(token), {
    gid: group.id,
    groupName: group.name,
    ownerName: nameOf(me),
    ownerUid: me.uid,
    expiresAt: now + INVITE_MS,
    revoked: false,
    createdAt: now,
  })
  batch.update(groupRef(group.id), { inviteId: token, inviteExpiresAt: now + INVITE_MS, updatedAt: now })
  void batch.commit().catch(reportError)
}

/** Stop the invite link working. Owner only. */
export function revokeInvite(group: WithId<Group>) {
  if (!group.inviteId) return
  const batch = writeBatch(db)
  batch.update(inviteRef(group.inviteId), { revoked: true })
  batch.update(groupRef(group.id), { inviteId: null, inviteExpiresAt: null, updatedAt: Date.now() })
  void batch.commit().catch(reportError)
}

/** Join a group from its invite. The rules check the invite (not revoked, not expired); a refusal is only logged. */
export function joinGroup(me: Me, invite: WithId<Invite>) {
  const now = Date.now()
  void updateDoc(groupRef(invite.gid), {
    memberUids: arrayUnion(me.uid),
    [`members.${me.uid}`]: { displayName: nameOf(me), photoURL: me.photoURL, joinedAt: now, via: invite.id },
    updatedAt: now,
  }).catch(reportError)
}

/** Leave a group (not the owner: an owner deletes the group instead). */
export function leaveGroup(me: Me, group: WithId<Group>) {
  void updateDoc(groupRef(group.id), {
    memberUids: arrayRemove(me.uid),
    [`members.${me.uid}`]: deleteField(),
    updatedAt: Date.now(),
  }).catch(reportError)
}

/**
 * Delete a group (owner only): soft-deleted, so its expenses and history stay for auditing, and its invite link is
 * turned off. Members' apps stop showing it.
 */
export function deleteGroup(me: Me, group: WithId<Group>) {
  const batch = writeBatch(db)
  batch.update(groupRef(group.id), { ...deletion(me.uid), inviteId: null, inviteExpiresAt: null, updatedAt: Date.now() })
  if (group.inviteId) batch.update(inviteRef(group.inviteId), { revoked: true })
  void batch.commit().catch(reportError)
}

