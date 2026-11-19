import { useState } from 'react'
import { Check, UserPlus, Users, X } from 'lucide-react'
import { AddFriendSheet } from '@/components/add-friend-sheet'
import { Avatar } from '@/components/avatar'
import { EmptyState } from '@/components/empty-state'
import { ListRow } from '@/components/list-row'
import { PillButton } from '@/components/pill-button'
import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import { acceptFriendRequest, removeFriendship, type Me, type WithId } from '@/lib/db'
import { otherUid, splitFriendships, type Friendship } from '@/lib/friends'
import type { AppUser } from '@/lib/firebase'

type Props = { user: AppUser; friendships: readonly WithId<Friendship>[] | undefined }

const Heading = ({ children }: { children: string }) => <h2 className="text-base font-semibold text-muted-foreground">{children}</h2>

export function PeopleScreen({ user, friendships }: Props) {
  const me: Me = user
  const [adding, setAdding] = useState(false)
  // `open` and `friend` are separate so the sheet keeps its title while it slides out.
  const [removing, setRemoving] = useState<{ open: boolean; friend?: WithId<Friendship> }>({ open: false })
  const { friends, incoming, outgoing } = splitFriendships(friendships ?? [], user.uid)

  const who = (f: Friendship) => f.names[otherUid(f, user.uid)]
  const nameOf = (f: Friendship) => who(f)?.displayName || 'Someone'
  const avatar = (f: Friendship) => <Avatar photoURL={who(f)?.photoURL} name={nameOf(f)} className="size-11 text-lg" />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">People</h1>
        {/* With no friends yet, the empty state below carries the same action. */}
        {!!friendships?.length && (
          <PillButton size="pill-sm" onClick={() => setAdding(true)}>
            <UserPlus className="size-5" />
            Add friend
          </PillButton>
        )}
      </div>

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
                  <PillButton variant="secondary" size="pill-sm" className="w-11 px-0" aria-label={`Decline ${nameOf(f)}`} onClick={() => removeFriendship(f.id)}>
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
                <PillButton variant="secondary" size="pill-sm" onClick={() => removeFriendship(f.id)}>
                  Cancel
                </PillButton>
              }
            />
          ))}
        </section>
      )}

      <AddFriendSheet open={adding} onClose={() => setAdding(false)} me={me} friendships={friendships ?? []} />
      <Sheet
        open={removing.open}
        onClose={() => setRemoving({ open: false, friend: removing.friend })}
        title={removing.friend ? nameOf(removing.friend) : ''}
      >
        <div className="flex flex-col gap-4 pb-1">
          <p className="text-base text-muted-foreground">Removing a friend stops new bills with them. Bills you already shared stay.</p>
          <SheetActions
            label="Close"
            onSave={() => setRemoving({ open: false, friend: removing.friend })}
            onDelete={() => {
              if (removing.friend) removeFriendship(removing.friend.id)
              setRemoving({ open: false })
            }}
            deleteLabel="Remove friend"
          />
        </div>
      </Sheet>
    </div>
  )
}
