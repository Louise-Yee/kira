import { useState } from 'react'
import { Avatar } from '@/components/avatar'
import { ListRow } from '@/components/list-row'
import { PillButton } from '@/components/pill-button'
import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import { TextField } from '@/components/text-field'
import { contactsSupported, readContactEmails } from '@/lib/contacts'
import {
  acceptFriendRequest,
  findByEmails,
  sendFriendRequest,
  type DirectoryEntry,
  type Me,
  type WithId,
} from '@/lib/db'
import { relationTo, type Friendship } from '@/lib/friends'
import { error as errorHaptic, success } from '@/lib/haptics'

type Props = { open: boolean; onClose: () => void; me: Me; friendships: readonly WithId<Friendship>[] }

type Found = DirectoryEntry & { email: string }

/** Contacts can hold thousands of emails and each lookup is a read, so only the first of them are checked. */
// ponytail: first 300 emails only; page through the rest or search by name if people hit the cap.
const CONTACT_LOOKUPS = 300

/** Find people on kira by typing an email or reading the phone's contacts, and ask them to be friends. */
export function AddFriendSheet({ open, onClose, me, friendships }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Add friends" tall>
      {/* Mounted only while open, so a new visit starts with an empty search. */}
      <Body onClose={onClose} me={me} friendships={friendships} />
    </Sheet>
  )
}

function Body({ onClose, me, friendships }: Omit<Props, 'open'>) {
  const [email, setEmail] = useState('')
  const [results, setResults] = useState<Found[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // `lookup` returns null when contacts permission was refused.
  const run = async (lookup: () => Promise<Found[] | null>, none: string) => {
    setBusy(true)
    setMessage(null)
    try {
      const found = await lookup()
      setResults(found ?? [])
      setMessage(found === null ? 'Allow contacts access to find friends.' : found.length ? null : none)
    } catch {
      errorHaptic()
      setMessage('Could not search right now. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const findTyped = () => run(() => findByEmails([email], me.uid), 'No one on kira is findable with that email.')
  const findContacts = () =>
    run(async () => {
      const emails = await readContactEmails()
      return emails && findByEmails(emails.slice(0, CONTACT_LOOKUPS), me.uid)
    }, 'None of your contacts are on kira yet.')

  const action = (f: Found) => {
    const relation = relationTo(friendships, me.uid, f.uid)
    if (relation === 'friend') return <span className="text-base text-muted-foreground">Friends</span>
    if (relation === 'sent') return <span className="text-base text-muted-foreground">Requested</span>
    const existing = friendships.find((x) => x.uids.includes(f.uid))
    return (
      <PillButton
        size="pill-sm"
        onClick={() => {
          if (relation === 'incoming' && existing) acceptFriendRequest(me, existing)
          else sendFriendRequest(me, f)
          success()
        }}
      >
        {relation === 'incoming' ? 'Accept' : 'Add'}
      </PillButton>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-1">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (email.trim() && !busy) findTyped()
        }}
      >
        <TextField
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="Friend's email"
          aria-label="Friend's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PillButton type="submit" size="pill-sm" disabled={busy || !email.trim()}>
          Find
        </PillButton>
      </form>
      {contactsSupported && (
        <PillButton variant="secondary" size="pill-sm" disabled={busy} onClick={findContacts}>
          Find from contacts
        </PillButton>
      )}
      {busy && <p className="text-base text-muted-foreground">Searching…</p>}
      {message && <p className="text-base text-muted-foreground">{message}</p>}
      <div className="flex flex-col gap-2">
        {results.map((f) => (
          <ListRow
            key={f.uid}
            icon={<Avatar photoURL={f.photoURL} name={f.displayName || f.email} className="size-11 text-lg" />}
            title={f.displayName || f.email}
            subtitle={f.email}
            trailing={action(f)}
          />
        ))}
      </div>
      <SheetActions label="Done" onSave={onClose} />
    </div>
  )
}
