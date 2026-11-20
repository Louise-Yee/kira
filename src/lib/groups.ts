import type { Totals } from './group-ledger.ts'

export type GroupMember = {
  displayName: string
  photoURL: string | null
  joinedAt: number
  /** The invite link this person joined with (absent for the owner). */
  via?: string
  /** Who invited this person from their friends list (when they joined that way). */
  invitedBy?: string
}

/** A friend a member invited, until they join or decline (or the inviter or owner cancels it). */
export type GroupInvitee = { displayName: string; photoURL: string | null; by: string; at: number }

/** `groups/{id}`: a set of friends who split bills together. Only members can read it. */
export type Group = {
  name: string
  ownerUid: string
  memberUids: string[]
  members: Record<string, GroupMember>
  /** The active invite link's token, if any. */
  inviteId: string | null
  inviteExpiresAt: number | null
  /** Running totals of the expenses (missing until the first one). */
  totals?: Totals
  /** Friends invited by a member who haven't answered yet (both absent until the first invite). They can read the group. */
  invitedUids?: string[]
  invited?: Record<string, GroupInvitee>
  createdAt: number
  updatedAt: number
}

/** `invites/{token}`: what a link shows before the person joins. Anyone signed in who has the token can read it. */
export type Invite = {
  gid: string
  groupName: string
  ownerName: string
  ownerUid: string
  expiresAt: number
  revoked: boolean
  createdAt: number
}

export const INVITE_MS = 7 * 24 * 60 * 60 * 1000
/** The rules cap a group at this many people. */
export const MAX_MEMBERS = 30
export const MAX_NAME = 40

/** A group name as saved: trimmed, spaces collapsed, cut to length. */
export const cleanGroupName = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME)

export function inviteStatus(inv: Pick<Invite, 'revoked' | 'expiresAt'>, now: number) {
  return inv.revoked ? ('revoked' as const) : inv.expiresAt <= now ? ('expired' as const) : ('ok' as const)
}

/** Whether the group has a link people can still join with. */
export const hasActiveInvite = (g: Pick<Group, 'inviteId' | 'inviteExpiresAt'>, now: number) =>
  g.inviteId !== null && (g.inviteExpiresAt ?? 0) > now

/** People invited and not yet in the group, oldest invite first (someone who joined by link meanwhile is left out). */
export function inviteesOf(g: Pick<Group, 'memberUids' | 'invited'>) {
  return Object.entries(g.invited ?? {})
    .filter(([uid]) => !g.memberUids.includes(uid))
    .map(([uid, invitee]) => ({ uid, invitee }))
    .toSorted((a, b) => a.invitee.at - b.invitee.at)
}

/** Members with the owner first, then by who joined first. */
export function membersOf(g: Pick<Group, 'ownerUid' | 'members'>) {
  return Object.entries(g.members)
    .map(([uid, member]) => ({ uid, member, owner: uid === g.ownerUid }))
    .toSorted((a, b) => Number(b.owner) - Number(a.owner) || a.member.joinedAt - b.member.joinedAt)
}
