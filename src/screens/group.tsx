import { useState } from 'react'
import { ArrowLeft, Link2, Pencil } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { GroupNameSheet } from '@/components/group-name-sheet'
import { ListRow } from '@/components/list-row'
import { PillButton } from '@/components/pill-button'
import { deleteGroup, leaveGroup, newInvite, renameGroup, revokeInvite, type Group, type Me, type WithId } from '@/lib/db'
import { hasActiveInvite, membersOf } from '@/lib/groups'
import { joinUrl, shareLink } from '@/lib/share-link'

type Props = {
  me: Me
  /** Undefined while the group hasn't arrived yet (just joined, or still loading). */
  group: WithId<Group> | undefined
  onBack: () => void
}

const day = 24 * 60 * 60 * 1000

export function GroupScreen({ me, group, onBack }: Props) {
  const [renaming, setRenaming] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // ponytail: read once per mount, so "expires in" can lag if the screen stays open for days.
  const [now] = useState(Date.now)

  const back = (
    <PillButton variant="secondary" size="pill-sm" className="w-11 px-0" aria-label="Back to people" onClick={onBack}>
      <ArrowLeft className="size-5" />
    </PillButton>
  )
  if (!group) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <p className="text-base text-muted-foreground">Joining the group…</p>
      </div>
    )
  }

  const owner = group.ownerUid === me.uid
  const active = hasActiveInvite(group, now)
  const daysLeft = Math.max(1, Math.ceil(((group.inviteExpiresAt ?? 0) - now) / day))

  const share = async () => {
    if (!group.inviteId) return
    try {
      const result = await shareLink(joinUrl(group.inviteId), `Join ${group.name} on kira`)
      setNotice(result === 'copied' ? 'Link copied' : null)
    } catch {
      setNotice('Could not share the link')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {back}
        <h1 className="min-w-0 flex-1 truncate font-heading text-3xl font-extrabold tracking-tight">{group.name}</h1>
        {owner && (
          <PillButton variant="secondary" size="pill-sm" className="w-11 px-0" aria-label="Rename group" onClick={() => setRenaming(true)}>
            <Pencil className="size-5" />
          </PillButton>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-muted-foreground">{group.memberUids.length} members</h2>
        {membersOf(group).map(({ uid, member, owner: isOwner }) => (
          <ListRow
            key={uid}
            icon={<Avatar photoURL={member.photoURL} name={member.displayName || '?'} className="size-11 text-lg" />}
            title={member.displayName || 'Someone'}
            subtitle={uid === me.uid ? (isOwner ? 'You · owner' : 'You') : isOwner ? 'Owner' : undefined}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
        <h2 className="text-base font-semibold">Invite link</h2>
        {active ? (
          <p className="text-base text-muted-foreground">Anyone with it can join. Works for {daysLeft} more {daysLeft === 1 ? 'day' : 'days'}.</p>
        ) : (
          <p className="text-base text-muted-foreground">{owner ? 'There is no working invite link.' : 'There is no working invite link. Ask the owner for a new one.'}</p>
        )}
        {active && (
          <PillButton onClick={share}>
            <Link2 className="size-5" />
            Share invite link
          </PillButton>
        )}
        {notice && <p className="text-base text-muted-foreground">{notice}</p>}
        {owner && (
          <div className="flex gap-2">
            <PillButton variant="secondary" size="pill-sm" className="flex-1" onClick={() => newInvite(me, group)}>
              {active ? 'New link' : 'Create link'}
            </PillButton>
            {active && (
              <PillButton variant="secondary" size="pill-sm" className="flex-1" onClick={() => revokeInvite(group)}>
                Turn off
              </PillButton>
            )}
          </div>
        )}
      </section>

      <PillButton variant="destructive" size="pill-sm" onClick={() => setLeaving(true)}>
        {owner ? 'Delete group' : 'Leave group'}
      </PillButton>

      <GroupNameSheet
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename group"
        initial={group.name}
        label="Save"
        onSave={(name) => renameGroup(group, name)}
      />
      <ConfirmSheet
        open={leaving}
        onClose={() => setLeaving(false)}
        title={owner ? `Delete ${group.name}?` : `Leave ${group.name}?`}
        text={owner ? 'This removes the group for everyone and turns off its invite link.' : 'You stop seeing this group. Someone can invite you back.'}
        confirmLabel={owner ? 'Delete group' : 'Leave group'}
        onConfirm={() => {
          if (owner) deleteGroup(group)
          else leaveGroup(me, group)
          setLeaving(false)
          onBack()
        }}
      />
    </div>
  )
}
