import { useState } from 'react'
import { PillButton } from '@/components/pill-button'
import { Sheet, SheetFooter } from '@/components/sheet'
import { joinGroup, useInvite, type Group, type Me, type WithId } from '@/lib/db'
import { inviteStatus } from '@/lib/groups'

type Props = {
  /** The token from the link. */
  token: string
  me: Me
  /** The groups I'm already in; undefined while they load. */
  groups: readonly WithId<Group>[] | undefined
  onClose: () => void
  /** Open this group; `isNew` when I just joined it (rather than already being in it). */
  onJoined: (groupId: string, isNew: boolean) => void
}

/** What opening a group invite link shows: "Join Dorm?" with Join or Decline. */
export function JoinGroupSheet({ token, me, groups, onClose, onJoined }: Props) {
  const invite = useInvite(token)
  const [now] = useState(Date.now)
  const status = invite && inviteStatus(invite, now)
  const already = invite && groups?.some((g) => g.id === invite.gid)

  let body = 'Loading the invite…'
  if (invite === null) body = "This invite link doesn't work. Ask for a new one."
  else if (status === 'revoked' || status === 'expired')
    body = `This invite link ${status === 'expired' ? 'has expired' : 'was turned off'}. Ask ${invite?.ownerName || 'the owner'} for a new one.`
  else if (invite && groups) body = already ? `You're already in ${invite.groupName}.` : `${invite.ownerName || 'Someone'} invited you to split bills together.`

  const ready = !!invite && status === 'ok' && !!groups
  return (
    <Sheet open onClose={onClose} title={ready && !already ? `Join ${invite.groupName}?` : (invite?.groupName ?? 'Group invite')}>
      <p className="pb-1 text-base text-muted-foreground">{body}</p>
      <SheetFooter>
        <div className="flex gap-2">
          <PillButton variant="secondary" className="flex-1" onClick={onClose}>
            {ready && !already ? 'Decline' : 'Close'}
          </PillButton>
          {ready && (
            <PillButton
              className="flex-1"
              onClick={() => {
                if (!already) joinGroup(me, invite)
                onJoined(invite.gid, !already)
              }}
            >
              {already ? 'Open' : 'Join'}
            </PillButton>
          )}
        </div>
      </SheetFooter>
    </Sheet>
  )
}
