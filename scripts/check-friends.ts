// Self-check for friendship helpers: node scripts/check-friends.ts
import assert from 'node:assert/strict'
import { friendshipId, otherUid, relationTo, sortedUids, splitFriendships, type Friendship } from '../src/lib/friends.ts'

assert.deepEqual(sortedUids('b', 'a'), ['a', 'b'])
assert.equal(friendshipId('b', 'a'), 'a_b')
assert.equal(friendshipId('a', 'b'), 'a_b')

const f = (a: string, b: string, requester: string, status: Friendship['status']): Friendship => ({
  uids: sortedUids(a, b), requester, status, names: {}, createdAt: 1, updatedAt: 1,
})
assert.equal(otherUid(f('me', 'zed', 'me', 'pending'), 'me'), 'zed')
assert.equal(otherUid(f('me', 'ann', 'me', 'pending'), 'me'), 'ann')

const list = [f('me', 'ann', 'ann', 'pending'), f('me', 'bob', 'me', 'pending'), f('me', 'cat', 'cat', 'accepted')]
const s = splitFriendships(list, 'me')
assert.deepEqual(s.incoming.map((x) => otherUid(x, 'me')), ['ann'])
assert.deepEqual(s.outgoing.map((x) => otherUid(x, 'me')), ['bob'])
assert.deepEqual(s.friends.map((x) => otherUid(x, 'me')), ['cat'])

assert.equal(relationTo(list, 'me', 'ann'), 'incoming')
assert.equal(relationTo(list, 'me', 'bob'), 'sent')
assert.equal(relationTo(list, 'me', 'cat'), 'friend')
assert.equal(relationTo(list, 'me', 'dan'), null)
console.log('check-friends: ok')
