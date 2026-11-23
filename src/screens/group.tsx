import { useState } from 'react'
import { ArrowLeft, Link2, Plus, Settings, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { GroupAutoLogCard } from '@/components/group-auto-log-card'
import { GroupExpenseDetailSheet } from '@/components/group-expense-detail-sheet'
import { GroupExpenseSheet } from '@/components/group-expense-sheet'
import { GroupSettleUp } from '@/components/group-settle-up'
import { ListRow } from '@/components/list-row'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { PillButton } from '@/components/pill-button'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { addDays, monthLabel, shortDate, todayISO } from '@/lib/date'
import {
  EXPENSES_PAGE,
  cancelGroupInvite,
  confirmSettlement,
  deleteGroupExpense,
  dismissSettlement,
  deleteGroup,
  inviteToGroup,
  leaveGroup,
  newInvite,
  rejectSettlement,
  renameGroup,
  revokeInvite,
  saveGroupExpense,
  setGroupLog,
  settleUp,
  takeBackSettlement,
  useOlderExpenses,
  useOlderSettlements,
  usePendingSettlements,
  useRecentExpenses,
  useRecentSettlements,
  useRejectedSettlements,
  type Category,
  type Group,
  type GroupLog,
  type Me,
  type WithId,
} from '@/lib/db'
import { emptyTotals, netOf, suggestTransfers, type GroupExpense } from '@/lib/group-ledger'
import { success } from '@/lib/haptics'
import { MAX_NAME, cleanGroupName, hasActiveInvite, inviteesOf, membersOf } from '@/lib/groups'
import { formatRM } from '@/lib/money'
import { joinUrl, shareLink } from '@/lib/share-link'
import { toast, toastUndo } from '@/lib/toast'

type Props = {
  me: Me
  /** Undefined while the group hasn't arrived yet (just joined, or still loading). */
  group: WithId<Group> | undefined
  /** My auto-log setting for this group. */
  log: GroupLog | undefined
  categories: readonly WithId<Category>[]
  /** My friends, to invite into the group. */
  friends: readonly { uid: string; displayName: string; photoURL: string | null }[]
  onBack: () => void
}

const day = 24 * 60 * 60 * 1000

export function GroupScreen({ me, group, log, categories, friends, onBack }: Props) {
  const [settings, setSettings] = useState(false)
  const [inviting, setInviting] = useState(false)

  const back = (
    <PillButton variant="secondary" size="pill-sm" className="w-11 px-0" aria-label="Back to people" onClick={onBack}>
      <ArrowLeft className="size-5" />
    </PillButton>
  )
  if (!group) {
    return (
      <div className="flex flex-col gap-5 pt-[calc(1.5rem+var(--inset-top))] lg:pt-0">
        {back}
        <p className="text-base text-muted-foreground">Joining the group…</p>
      </div>
    )
  }

  const count = group.memberUids.length
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={group.name}
        leading={back}
        action={
          <PillButton variant="secondary" size="pill-sm" className="w-11 px-0" aria-label="Group settings" onClick={() => setSettings(true)}>
            <Settings className="size-5" />
          </PillButton>
        }
      />

      <GroupLedger me={me} group={group} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-muted-foreground">
            {count} {count === 1 ? 'member' : 'members'}
          </h2>
          {friends.length > 0 && (
            <PillButton variant="secondary" size="pill-sm" onClick={() => setInviting(true)}>
              <UserPlus className="size-5" />
              Add friends
            </PillButton>
          )}
        </div>
        {membersOf(group).map(({ uid, member, owner: isOwner }) => (
          <ListRow
            key={uid}
            icon={<Avatar photoURL={member.photoURL} name={member.displayName || '?'} className="size-11 text-lg" />}
            title={member.displayName || 'Someone'}
            subtitle={uid === me.uid ? (isOwner ? 'You · owner' : 'You') : isOwner ? 'Owner' : undefined}
          />
        ))}
        {inviteesOf(group).map(({ uid, invitee }) => (
          <ListRow
            key={uid}
            icon={<Avatar photoURL={invitee.photoURL} name={invitee.displayName || '?'} className="size-11 text-lg" />}
            title={invitee.displayName || 'Someone'}
            subtitle={`Invited by ${invitee.by === me.uid ? 'you' : group.members[invitee.by]?.displayName || 'someone'}`}
            trailing={
              (invitee.by === me.uid || group.ownerUid === me.uid) && (
                <PillButton variant="secondary" size="pill-sm" onClick={() => cancelGroupInvite(group.id, uid)}>
                  Cancel
                </PillButton>
              )
            }
          />
        ))}
      </section>

      <Sheet open={inviting} onClose={() => setInviting(false)} title={`Add friends to ${group.name}`}>
        <div className="flex flex-col gap-2 pb-1">
          {friends
            .filter((f) => !group.memberUids.includes(f.uid))
            .map((f) => {
              const invited = !!group.invited?.[f.uid]
              return (
                <ListRow
                  key={f.uid}
                  icon={<Avatar photoURL={f.photoURL} name={f.displayName || '?'} className="size-11 text-lg" />}
                  title={f.displayName || 'Someone'}
                  trailing={
                    <PillButton size="pill-sm" variant={invited ? 'secondary' : 'default'} disabled={invited} onClick={() => inviteToGroup(me, group.id, f)}>
                      {invited ? 'Invited' : 'Invite'}
                    </PillButton>
                  }
                />
              )
            })}
          {friends.every((f) => group.memberUids.includes(f.uid)) && <p className="text-base text-muted-foreground">All your friends are in this group.</p>}
          <p className="text-base text-muted-foreground">They join from their People tab. Someone not on your friends list can use the invite link.</p>
        </div>
      </Sheet>

      <Sheet open={settings} onClose={() => setSettings(false)} title="Group settings" tall>
        <GroupSettings me={me} group={group} log={log} categories={categories} onGone={onBack} />
      </Sheet>
    </div>
  )
}

/** The group's settings sheet: its name (owner), the invite link, auto-log, and leaving or deleting it. */
function GroupSettings({ me, group, log, categories, onGone }: Omit<Props, 'group' | 'onBack' | 'friends'> & { group: WithId<Group>; onGone: () => void }) {
  const [name, setName] = useState(group.name)
  const [leaving, setLeaving] = useState(false)
  // ponytail: read once per open, so "expires in" can lag if the sheet stays open for days.
  const [now] = useState(Date.now)
  const owner = group.ownerUid === me.uid
  const active = hasActiveInvite(group, now)
  const daysLeft = Math.max(1, Math.ceil(((group.inviteExpiresAt ?? 0) - now) / day))
  const clean = cleanGroupName(name)

  const share = async () => {
    if (!group.inviteId) return
    try {
      const result = await shareLink(joinUrl(group.inviteId), `Join ${group.name} on kira`)
      if (result === 'copied') toast('Link copied')
    } catch {
      toast("Couldn't share the link", 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-1">
      {owner && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (clean && clean !== group.name) renameGroup(group, clean)
          }}
        >
          <TextField value={name} maxLength={MAX_NAME} aria-label="Group name" onChange={(e) => setName(e.target.value)} />
          <PillButton type="submit" variant="secondary" className="h-12 shrink-0" disabled={!clean || clean === group.name}>
            Rename
          </PillButton>
        </form>
      )}

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

      <GroupAutoLogCard log={log} categories={categories} onChange={(next) => setGroupLog(me.uid, group.id, next)} />

      <PillButton variant="destructive" size="pill-sm" onClick={() => setLeaving(true)}>
        {owner ? 'Delete group' : 'Leave group'}
      </PillButton>

      <ConfirmSheet
        open={leaving}
        onClose={() => setLeaving(false)}
        title={owner ? `Delete ${group.name}?` : `Leave ${group.name}?`}
        text={owner ? 'This removes the group for everyone and turns off its invite link.' : 'You stop seeing this group. Someone can invite you back.'}
        confirmLabel={owner ? 'Delete group' : 'Leave group'}
        onConfirm={() => {
          if (owner) deleteGroup(me, group)
          else leaveGroup(me, group)
          setLeaving(false)
          onGone()
        }}
      />
    </div>
  )
}

/** Adding expenses, and the audit view: totals, who is ahead or behind, and every expense, newest first. */
function GroupLedger({ me, group }: { me: Me; group: WithId<Group> }) {
  // ponytail: read once per mount, so the feed window can lag past midnight if the screen stays open.
  const [today] = useState(todayISO)
  const since = addDays(today, -60)
  const [pages, setPages] = useState(0)
  const recent = useRecentExpenses(group.id, since)
  const older = useOlderExpenses(group.id, since, pages * EXPENSES_PAGE, pages > 0)
  const recentPays = useRecentSettlements(group.id, since)
  const olderPays = useOlderSettlements(group.id, since, pages * EXPENSES_PAGE, pages > 0)
  const pending = usePendingSettlements(group.id)
  const rejected = useRejectedSettlements(group.id)
  // Expenses and settle-up payments share one feed, newest first.
  const feed = [
    ...[...(recent ?? []), ...(older ?? [])].map((e) => ({ kind: 'expense' as const, date: e.date, at: e.createdAt, e })),
    ...[...(recentPays ?? []), ...(olderPays ?? [])].map((s) => ({ kind: 'payment' as const, date: s.date, at: s.createdAt, s })),
  ].toSorted((a, b) => b.date.localeCompare(a.date) || b.at - a.at)
  const canLoadMore =
    recent !== undefined &&
    (pages === 0 || (older?.length ?? 0) >= pages * EXPENSES_PAGE || (olderPays?.length ?? 0) >= pages * EXPENSES_PAGE)

  // `open` and `expense` are separate so a sheet keeps its content while it slides out.
  const [form, setForm] = useState<{ open: boolean; expense?: WithId<GroupExpense> }>({ open: false })
  const [detail, setDetail] = useState<{ open: boolean; expense?: WithId<GroupExpense> }>({ open: false })

  const totals = group.totals ?? emptyTotals()
  const nameOf = (uid: string) => group.members[uid]?.displayName || (group.memberUids.includes(uid) ? 'Someone' : 'Someone who left')
  const people = [...new Set([...group.memberUids, ...Object.keys(totals.paid), ...Object.keys(totals.owed)])]
  const transfers = suggestTransfers(Object.fromEntries(people.map((uid) => [uid, netOf(totals, uid)])))
  const months = Object.entries(totals.months)
    .filter(([, sen]) => sen !== 0)
    .toSorted(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)

  return (
    <>
      <PillButton onClick={() => setForm({ open: true })}>
        <Plus className="size-5" />
        Add expense
      </PillButton>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
        <h2 className="text-base font-semibold text-muted-foreground">Total spent</h2>
        <Money sen={totals.spent} className="font-heading text-4xl font-extrabold" />
        {months.map(([ym, sen]) => (
          <div key={ym} className="flex items-center justify-between gap-3 text-base text-muted-foreground">
            <span>{monthLabel(ym)}</span>
            <Money sen={sen} />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-muted-foreground">Balances</h2>
        {/* Its own row rather than ListRow: the amounts must never be cut off, only a long name may be. */}
        {people.map((uid) => (
          <div key={uid} className="flex min-h-14 items-center gap-3 rounded-2xl bg-card p-3">
            <Avatar photoURL={group.members[uid]?.photoURL} name={nameOf(uid)} className="size-11 shrink-0 text-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-base font-semibold">{nameOf(uid)}</span>
                <Money sen={netOf(totals, uid)} sign className="shrink-0 text-base font-semibold" />
              </div>
              <div className="flex flex-wrap gap-x-3 text-base text-muted-foreground">
                <span>Paid {formatRM(totals.paid[uid] ?? 0)}</span>
                <span>Share {formatRM(totals.owed[uid] ?? 0)}</span>
              </div>
            </div>
          </div>
        ))}
        <p className="text-base text-muted-foreground">+ is what they are owed, − is what they owe.</p>
      </section>

      <GroupSettleUp
        group={group}
        meUid={me.uid}
        transfers={transfers}
        pending={pending ?? []}
        rejected={(rejected ?? []).filter((s) => s.from === me.uid)}
        allSettled={totals.spent > 0}
        onSettle={(t) => {
          success()
          settleUp(me, group.id, t, today)
        }}
        onConfirm={(s) => {
          success()
          confirmSettlement(group.id, s)
        }}
        onTakeBack={(s) => (s.to === me.uid ? rejectSettlement(group.id, s) : toastUndo('Payment taken back', takeBackSettlement(me, group.id, s)))}
        onDismiss={(s) => dismissSettlement(me, group.id, s)}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-muted-foreground">Expenses</h2>
        {recent?.length === 0 && recentPays?.length === 0 && (
          <p className="text-base text-muted-foreground">Nothing in the last 60 days.{pages === 0 && ' Add the first expense.'}</p>
        )}
        {feed.map((item, i) => [
          // The older pages come after the recent window, under their own label.
          item.date < since && (i === 0 || feed[i - 1].date >= since) && (
            <h3 key="older" className="pt-2 text-base font-semibold text-muted-foreground">
              Older
            </h3>
          ),
          item.kind === 'expense' ? (
            <ListRow
              key={`e-${item.e.id}`}
              title={item.e.title}
              subtitle={`${shortDate(item.date)} · paid by ${nameOf(item.e.paidBy)}`}
              trailing={<Money sen={item.e.amount} className="text-base font-semibold" />}
              onClick={() => setDetail({ open: true, expense: item.e })}
            />
          ) : (
            <ListRow
              key={`p-${item.s.id}`}
              title={`${nameOf(item.s.from)} paid ${nameOf(item.s.to)}`}
              subtitle={`${shortDate(item.date)} · ${{ confirmed: 'confirmed', rejected: 'not received', pending: 'waiting for confirmation' }[item.s.status]}`}
              trailing={<Money sen={item.s.amount} className="text-base font-semibold" />}
            />
          ),
        ])}
        {canLoadMore && (
          <PillButton variant="secondary" size="pill-sm" onClick={() => setPages((p) => p + 1)}>
            Show older
          </PillButton>
        )}
      </section>

      <GroupExpenseSheet
        open={form.open}
        onClose={() => setForm({ open: false, expense: form.expense })}
        group={group}
        meUid={me.uid}
        initial={form.expense}
        onSave={(draft) => saveGroupExpense(me, group.id, draft, form.expense)}
      />
      <GroupExpenseDetailSheet
        open={detail.open}
        onClose={() => setDetail({ open: false, expense: detail.expense })}
        group={group}
        meUid={me.uid}
        expense={detail.expense}
        onEdit={(expense) => {
          setDetail({ open: false, expense })
          setForm({ open: true, expense })
        }}
        onDelete={(expense) => toastUndo('Expense deleted', deleteGroupExpense(me, group.id, expense))}
      />
    </>
  )
}
