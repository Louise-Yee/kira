import { useState } from 'react'
import { Check, UserPlus, Users, X } from 'lucide-react'
import { AddFriendSheet } from '@/components/add-friend-sheet'
import { Avatar } from '@/components/avatar'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { PendingSettlementRow } from '@/components/pending-settlement-row'
import { EmptyState } from '@/components/empty-state'
import { GroupNameSheet } from '@/components/group-name-sheet'
import { ListRow } from '@/components/list-row'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import {
  acceptFriendRequest,
  confirmSettlement,
  createGroup,
  removeFriendship,
  acceptGroupInvite,
  cancelGroupInvite,
  dismissSettlement,
  rejectSettlement,
  useCategories,
  type Group,
  type GroupLog,
  type Me,
  type PendingForMe,
  type WithId,
} from '@/lib/db'
import { otherUid, splitFriendships, type Friendship } from '@/lib/friends'
import type { AppUser } from '@/lib/firebase'
import { Money } from '@/components/money'
import { shortDate } from '@/lib/date'
import { success } from '@/lib/haptics'
import { useBackClose } from '@/lib/use-back-close'
import { GroupScreen } from '@/screens/group'

type Props = {
  user: AppUser
  friendships: readonly WithId<Friendship>[] | undefined
  groups: readonly WithId<Group>[] | undefined
  /** Payments made to me that wait for me to confirm, from all my groups. */
  toConfirm: readonly PendingForMe[]
  /** Groups a friend invited me to. */
  groupInvites: readonly WithId<Group>[]
  /** My auto-log settings, by group id. */
  logs: readonly (GroupLog & { id: string })[] | undefined
  /** A group to open straight away (after joining by link). */
  openGroupId?: string
}

const segments = [
  { value: 'friends', label: 'Friends' },
  { value: 'groups', label: 'Groups' },
] as const

const Heading = ({ children }: { children: string }) => <h2 className="text-base font-semibold text-muted-foreground">{children}</h2>

export function PeopleScreen({ user, friendships, groups, toConfirm, groupInvites, logs, openGroupId }: Props) {
  const categories = useCategories(user.uid) ?? []
  const me: Me = user
  const joined = openGroupId ?? null
  const [segment, setSegment] = useState<(typeof segments)[number]['value']>(joined ? 'groups' : 'friends')
  const [groupId, setGroupId] = useState<string | null>(joined)
  useBackClose(groupId !== null, () => setGroupId(null))
  const [adding, setAdding] = useState(false)
  const [creating, setCreating] = useState(false)
  // `open` and `friend` are separate so the sheet keeps its title while it slides out.
  const [removing, setRemoving] = useState<{ open: boolean; friend?: WithId<Friendship> }>({ open: false })
  const { friends, incoming, outgoing } = splitFriendships(friendships ?? [], user.uid)
  const pendingToMe = toConfirm.filter((s) => s.status === 'pending')
  const notReceived = toConfirm.filter((s) => s.status === 'rejected')

  if (groupId !== null) {
    return (
      <GroupScreen
        me={me}
        group={groups?.find((g) => g.id === groupId)}
        log={logs?.find((l) => l.id === groupId)}
        categories={categories}
        friends={friends.map((f) => ({ uid: otherUid(f, user.uid), ...f.names[otherUid(f, user.uid)] }))}
        onBack={() => setGroupId(null)}
      />
    )
  }

  const who = (f: Friendship) => f.names[otherUid(f, user.uid)]
  const nameOf = (f: Friendship) => who(f)?.displayName || 'Someone'
  const avatar = (f: Friendship) => <Avatar photoURL={who(f)?.photoURL} name={nameOf(f)} className="size-11 text-lg" />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">People</h1>
        {/* With nothing yet, the empty state below carries the same action. */}
        {segment === 'friends' && !!friendships?.length && (
          <PillButton size="pill-sm" onClick={() => setAdding(true)}>
            <UserPlus className="size-5" />
            Add friend
          </PillButton>
        )}
        {segment === 'groups' && !!groups?.length && (
          <PillButton size="pill-sm" onClick={() => setCreating(true)}>
            <Users className="size-5" />
            New group
          </PillButton>
        )}
      </div>
      {groupInvites.length > 0 && (
        <section className="flex flex-col gap-2">
          <Heading>Group invites</Heading>
          {groupInvites.map((g) => {
            const by = g.invited?.[user.uid]?.by ?? ''
            return (
              <PendingSettlementRow
                key={g.id}
                title={`${g.members[by]?.displayName || 'A friend'} invited you to ${g.name}`}
                subtitle={`${g.memberUids.length} ${g.memberUids.length === 1 ? 'member' : 'members'}`}
                confirmLabel="Join"
                onConfirm={() => {
                  success()
                  acceptGroupInvite(me, g)
                  setGroupId(g.id)
                }}
                takeBack={{ label: 'Decline', onClick: () => cancelGroupInvite(g.id, user.uid) }}
              />
            )
          })}
        </section>
      )}
      {notReceived.length > 0 && (
        <section className="flex flex-col gap-2">
          <Heading>Not received</Heading>
          {notReceived.map((s) => {
            const group = groups?.find((g) => g.id === s.gid)
            return (
              <PendingSettlementRow
                key={`${s.gid}-${s.id}`}
                title={`${group?.members[s.to]?.displayName || 'Someone'} didn't get your payment`}
                subtitle={
                  <>
                    <Money sen={s.amount} /> · {group?.name ?? 'a group'} · {shortDate(s.date)}
                  </>
                }
                takeBack={{ label: 'OK', onClick: () => dismissSettlement(me, s.gid, s) }}
              />
            )
          })}
        </section>
      )}
      {pendingToMe.length > 0 && (
        <section className="flex flex-col gap-2">
          <Heading>To confirm</Heading>
          {pendingToMe.map((s) => {
            const group = groups?.find((g) => g.id === s.gid)
            return (
              <PendingSettlementRow
                key={`${s.gid}-${s.id}`}
                title={`${group?.members[s.from]?.displayName || 'Someone'} says they paid you`}
                subtitle={
                  <>
                    <Money sen={s.amount} /> · {group?.name ?? 'a group'} · {shortDate(s.date)}
                  </>
                }
                onConfirm={() => {
                  success()
                  confirmSettlement(s.gid, s)
                }}
                takeBack={{ label: 'Not received', onClick: () => rejectSettlement(s.gid, s) }}
              />
            )
          })}
        </section>
      )}
      <Segmented options={segments} value={segment} onChange={setSegment} />

      {segment === 'friends' && (
        <>
          {friendships?.length === 0 && (
            <EmptyState
              icon={Users}
              text="Add friends to split bills with them without typing their name."
              action={{ label: 'Add friends', onClick: () => setAdding(true) }}
            />
          )}

          {incoming.length > 0 && (
            <section className="flex flex-col gap-2">
              <Heading>Requests</Heading>
              {incoming.map((f) => (
                <ListRow
                  key={f.id}
                  icon={avatar(f)}
                  title={nameOf(f)}
                  subtitle="Wants to be friends"
                  trailing={
                    <span className="flex items-center gap-2">
                      <PillButton size="pill-sm" className="w-11 px-0" aria-label={`Accept ${nameOf(f)}`} onClick={() => acceptFriendRequest(me, f)}>
                        <Check className="size-5" />
                      </PillButton>
                      <PillButton variant="secondary" size="pill-sm" className="w-11 px-0" aria-label={`Decline ${nameOf(f)}`} onClick={() => removeFriendship(me, f.id)}>
                        <X className="size-5" />
                      </PillButton>
                    </span>
                  }
                />
              ))}
            </section>
          )}

          {friends.length > 0 && (
            <section className="flex flex-col gap-2">
              <Heading>Friends</Heading>
              {friends.map((f) => (
                <ListRow key={f.id} icon={avatar(f)} title={nameOf(f)} onClick={() => setRemoving({ open: true, friend: f })} />
              ))}
            </section>
          )}

          {outgoing.length > 0 && (
            <section className="flex flex-col gap-2">
              <Heading>Waiting for a reply</Heading>
              {outgoing.map((f) => (
                <ListRow
                  key={f.id}
                  icon={avatar(f)}
                  title={nameOf(f)}
                  trailing={
                    <PillButton variant="secondary" size="pill-sm" onClick={() => removeFriendship(me, f.id)}>
                      Cancel
                    </PillButton>
                  }
                />
              ))}
            </section>
          )}
        </>
      )}

      {segment === 'groups' && (
        <>
          {groups?.length === 0 && (
            <EmptyState
              icon={Users}
              text="Make a group for the people you hang out with, then share the invite link."
              action={{ label: 'New group', onClick: () => setCreating(true) }}
            />
          )}
          {!!groups?.length && (
            <section className="flex flex-col gap-2">
              {groups.map((g) => (
                <ListRow
                  key={g.id}
                  icon={<Avatar name={g.name} className="size-11 text-lg" />}
                  title={g.name}
                  subtitle={`${g.memberUids.length} ${g.memberUids.length === 1 ? 'member' : 'members'}`}
                  onClick={() => setGroupId(g.id)}
                />
              ))}
            </section>
          )}
        </>
      )}

      <AddFriendSheet open={adding} onClose={() => setAdding(false)} me={me} friendships={friendships ?? []} />
      <GroupNameSheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New group"
        label="Create"
        onSave={(name) => setGroupId(createGroup(me, name))}
      />
      <ConfirmSheet
        open={removing.open}
        onClose={() => setRemoving({ open: false, friend: removing.friend })}
        title={removing.friend ? nameOf(removing.friend) : ''}
        text="Removing a friend stops new bills with them. Bills you already shared stay."
        confirmLabel="Remove friend"
        onConfirm={() => {
          if (removing.friend) removeFriendship(me, removing.friend.id)
          setRemoving({ open: false })
        }}
      />
    </div>
  )
}
