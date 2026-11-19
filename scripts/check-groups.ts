// Self-check for group helpers: node scripts/check-groups.ts
import assert from 'node:assert/strict'
import { cleanGroupName, hasActiveInvite, inviteStatus, INVITE_MS, MAX_NAME, membersOf } from '../src/lib/groups.ts'

assert.equal(cleanGroupName("  Louise's   Dorm "), "Louise's Dorm")
assert.equal(cleanGroupName('   '), '')
assert.equal(cleanGroupName('x'.repeat(100)).length, MAX_NAME)

assert.equal(inviteStatus({ revoked: false, expiresAt: 100 }, 99), 'ok')
assert.equal(inviteStatus({ revoked: false, expiresAt: 100 }, 100), 'expired')
assert.equal(inviteStatus({ revoked: true, expiresAt: 100 }, 1), 'revoked')

assert.equal(hasActiveInvite({ inviteId: 'a', inviteExpiresAt: INVITE_MS }, 1), true)
assert.equal(hasActiveInvite({ inviteId: 'a', inviteExpiresAt: 5 }, 5), false)
assert.equal(hasActiveInvite({ inviteId: null, inviteExpiresAt: null }, 1), false)

const m = (joinedAt: number) => ({ displayName: 'n', photoURL: null, joinedAt })
const order = membersOf({ ownerUid: 'o', members: { b: m(30), o: m(50), a: m(20) } }).map((x) => x.uid)
assert.deepEqual(order, ['o', 'a', 'b'])
console.log('check-groups: ok')
