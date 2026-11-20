// Self-check for group helpers: node scripts/check-groups.ts
import assert from 'node:assert/strict'
import { cleanGroupName, hasActiveInvite, inviteesOf, inviteStatus, INVITE_MS, MAX_NAME, membersOf } from '../src/lib/groups.ts'

assert.equal(cleanGroupName("  Louise's   Dorm "), "Louise's Dorm")
assert.equal(cleanGroupName('   '), '')
assert.equal(cleanGroupName('x'.repeat(100)).length, MAX_NAME)

assert.equal(inviteStatus({ revoked: false, expiresAt: 100 }, 99), 'ok')
assert.equal(inviteStatus({ revoked: false, expiresAt: 100 }, 100), 'expired')
assert.equal(inviteStatus({ revoked: true, expiresAt: 100 }, 1), 'revoked')

assert.equal(hasActiveInvite({ inviteId: 'a', inviteExpiresAt: INVITE_MS }, 1), true)
assert.equal(hasActiveInvite({ inviteId: 'a', inviteExpiresAt: 5 }, 5), false)
assert.equal(hasActiveInvite({ inviteId: null, inviteExpiresAt: null }, 1), false)

// Invitees: oldest first, and anyone who is already a member (joined by link meanwhile) is left out.
const inv = (at: number) => ({ displayName: 'x', photoURL: null, by: 'a', at })
assert.deepEqual(inviteesOf({ memberUids: ['a', 'c'], invited: { b: inv(2), c: inv(1), d: inv(1) } }).map((i) => i.uid), ['d', 'b'])
assert.deepEqual(inviteesOf({ memberUids: ['a'] }), [])

const m = (joinedAt: number) => ({ displayName: 'n', photoURL: null, joinedAt })
const order = membersOf({ ownerUid: 'o', members: { b: m(30), o: m(50), a: m(20) } }).map((x) => x.uid)
assert.deepEqual(order, ['o', 'a', 'b'])
console.log('check-groups: ok')
