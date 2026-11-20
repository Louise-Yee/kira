import type { Deletion } from './deletion.ts'
export type FriendName = { displayName: string; photoURL: string | null }

/** `friendships/{id}`: a request (pending) or a friendship (accepted) between two users. `uids` is sorted. */
export type Friendship = {
  uids: [string, string]
  /** Who sent the request. */
  requester: string
  status: 'pending' | 'accepted'
  /** Each side's name and photo as they last wrote them, by uid. */
  names: Record<string, FriendName>
  createdAt: number
  updatedAt: number
} & Deletion

/** The two uids in the order the document id and rules use. */
export const sortedUids = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a])

export const friendshipId = (a: string, b: string) => sortedUids(a, b).join('_')

export const otherUid = (f: Pick<Friendship, 'uids'>, me: string) => (f.uids[0] === me ? f.uids[1] : f.uids[0])

/** Friends, requests sent to me, and requests I sent. */
export function splitFriendships<T extends Friendship>(list: readonly T[], me: string) {
  return {
    friends: list.filter((f) => f.status === 'accepted'),
    incoming: list.filter((f) => f.status === 'pending' && f.requester !== me),
    outgoing: list.filter((f) => f.status === 'pending' && f.requester === me),
  }
}

/** How `uid` stands with me, for deciding what a search result can do. */
export function relationTo<T extends Friendship>(list: readonly T[], me: string, uid: string) {
  const f = list.find((x) => x.uids.includes(uid))
  if (!f) return null
  return f.status === 'accepted' ? ('friend' as const) : f.requester === me ? ('sent' as const) : ('incoming' as const)
}
