import { useState } from 'react'
import { AmountInput } from '@/components/amount-input'
import { DatePicker } from '@/components/date-picker'
import { MemberChips, type Person } from '@/components/member-chips'
import { Money } from '@/components/money'
import { Segmented } from '@/components/segmented'
import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import { TextField } from '@/components/text-field'
import { todayISO } from '@/lib/date'
import type { Group, WithId } from '@/lib/db'
import { evenShares, sharesProblem, type ExpenseDraft, type GroupExpense } from '@/lib/group-ledger'
import { membersOf } from '@/lib/groups'
import { success } from '@/lib/haptics'

type Props = {
  open: boolean
  onClose: () => void
  group: WithId<Group>
  /** Who is adding it: starts as the payer. */
  meUid: string
  /** Set to edit an existing expense; omit to add. */
  initial?: WithId<GroupExpense>
  onSave: (draft: ExpenseDraft) => void
}

const modes = [
  { value: 'even', label: 'Equally' },
  { value: 'exact', label: 'Exact amounts' },
] as const

export function GroupExpenseSheet({ open, onClose, initial, ...rest }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Edit expense' : 'Add expense'} size="full">
      {/* Mounted only while open, so the form starts fresh each time. */}
      <Form initial={initial} onClose={onClose} {...rest} />
    </Sheet>
  )
}

function Form({ group, meUid, initial, onSave, onClose }: Omit<Props, 'open'>) {
  const members = membersOf(group)
  const people: Person[] = members.map((m) => ({ uid: m.uid, name: m.member.displayName || 'Someone', photoURL: m.member.photoURL }))
  const nameOf = (uid: string) => people.find((p) => p.uid === uid)?.name ?? 'Someone'

  const [title, setTitle] = useState(initial?.title ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? meUid)
  // Editing keeps the exact amounts only when they weren't an equal split.
  const initialUids = initial ? Object.keys(initial.shares) : people.map((p) => p.uid)
  const [mode, setMode] = useState<(typeof modes)[number]['value']>(
    initial && JSON.stringify(evenShares(initial.amount, initialUids)) !== JSON.stringify(initial.shares) ? 'exact' : 'even',
  )
  const [picked, setPicked] = useState<string[]>(initialUids)
  const [exact, setExact] = useState<Record<string, number>>(initial?.shares ?? {})

  // Keep the member order of the group, whatever order the taps came in.
  const chosen = people.filter((p) => picked.includes(p.uid)).map((p) => p.uid)
  const shares = mode === 'even' ? evenShares(amount, chosen) : Object.fromEntries(chosen.map((uid) => [uid, exact[uid] ?? 0]))
  const problem = sharesProblem(amount, shares)
  const left = amount - Object.values(shares).reduce((a, b) => a + b, 0)
  const draft: ExpenseDraft | null = title.trim() && date && !problem ? { title: title.trim(), date, amount, paidBy, shares } : null

  return (
    <div className="flex flex-col gap-4 pb-1">
      <SheetActions
        label={initial ? 'Save' : 'Add'}
        disabled={!draft}
        onSave={() => {
          if (!draft) return
          success()
          onSave(draft)
          onClose()
        }}
      />
      <TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What was it for?" aria-label="Title" maxLength={100} />
      <AmountInput value={amount} onChange={setAmount} autoFocus={!initial} />
      <DatePicker value={date} onChange={setDate} aria-label="Date" />

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-muted-foreground">Paid by</h3>
        <MemberChips people={people} selected={[paidBy]} onToggle={setPaidBy} label="Paid by" />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-muted-foreground">Split between</h3>
        <MemberChips
          people={people}
          selected={picked}
          onToggle={(uid) => setPicked((p) => (p.includes(uid) ? p.filter((u) => u !== uid) : [...p, uid]))}
          label="Split between"
        />
        <Segmented
          options={modes}
          value={mode}
          onChange={(m) => {
            // Start the exact amounts from the equal split, so there is only a little to adjust.
            if (m === 'exact' && Object.keys(exact).length === 0) setExact(evenShares(amount, chosen))
            setMode(m)
          }}
        />
        {chosen.map((uid) => (
          <div key={uid} className="flex min-h-11 items-center justify-between gap-3">
            <span className="min-w-0 truncate text-base">{nameOf(uid)}</span>
            {mode === 'even' ? (
              <Money sen={shares[uid] ?? 0} className="text-base font-semibold" />
            ) : (
              <AmountInput size="sm" value={exact[uid] ?? 0} onChange={(sen) => setExact((e) => ({ ...e, [uid]: sen }))} />
            )}
          </div>
        ))}
        {amount > 0 && problem && (
          <p className="text-base text-muted-foreground">
            {problem}
            {mode === 'exact' && chosen.length > 0 && left !== 0 && (
              <>
                {' '}
                <Money sen={Math.abs(left)} /> {left > 0 ? 'left to assign.' : 'too much.'}
              </>
            )}
          </p>
        )}
      </section>
    </div>
  )
}
