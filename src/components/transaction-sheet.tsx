import { useState } from 'react'
import { AmountInput } from '@/components/amount-input'
import { CategoryPicker } from '@/components/category-picker'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import { Sheet } from '@/components/sheet'
import { todayISO } from '@/lib/date'
import type { Category, Kind, Transaction, TransactionDraft, WithId } from '@/lib/db'

type Props = {
  open: boolean
  onClose: () => void
  categories: readonly WithId<Category>[]
  /** Set to edit an existing transaction; omit to add. */
  initial?: WithId<Transaction>
  onSave: (draft: TransactionDraft) => void
  onDelete?: () => void
}

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const satisfies readonly { value: Kind; label: string }[]

const field = 'h-12 w-full rounded-2xl bg-secondary px-4 text-base outline-none placeholder:text-muted-foreground'

export function TransactionSheet({ open, onClose, initial, ...rest }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Edit transaction' : 'New transaction'}>
      {/* Mounted only while open, so the form starts fresh each time. */}
      <Form initial={initial} onClose={onClose} {...rest} />
    </Sheet>
  )
}

function Form({ initial, categories, onSave, onDelete, onClose }: Omit<Props, 'open'>) {
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'expense')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [note, setNote] = useState(initial?.note ?? '')
  const [confirming, setConfirming] = useState(false)

  // Archived categories are hidden, except the one this transaction already uses.
  const choices = categories.filter((c) => c.kind === kind && (!c.archived || c.id === initial?.categoryId))
  // null until the form can be saved (amount entered, category picked, date set).
  const draft: TransactionDraft | null =
    amount > 0 && categoryId && date ? { kind, amount, categoryId, date, note: note.trim() } : null
  const badge = initial?.recurringId ? 'Recurring' : initial?.splitId ? 'Split' : null

  return (
    <div className="flex flex-col gap-4 pb-1">
      {badge && (
        <span className="w-fit rounded-full bg-accent px-3 py-1 text-base font-semibold text-accent-foreground">
          {badge}
        </span>
      )}
      <Segmented
        options={kindOptions}
        value={kind}
        onChange={(k) => {
          setKind(k)
          // A category belongs to one kind: drop the pick if it no longer fits.
          if (categories.find((c) => c.id === categoryId)?.kind !== k) setCategoryId(null)
        }}
      />
      <AmountInput value={amount} onChange={setAmount} autoFocus />
      <CategoryPicker categories={choices} value={categoryId} onChange={setCategoryId} />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className={field} />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        aria-label="Note"
        maxLength={200}
        className={field}
      />
      <PillButton
        disabled={!draft}
        onClick={() => {
          if (!draft) return
          onSave(draft)
          onClose()
        }}
      >
        Save
      </PillButton>
      {initial && onDelete && (
        confirming ? (
          <div className="flex gap-2">
            <PillButton variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
              Keep
            </PillButton>
            <PillButton
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onDelete()
                onClose()
              }}
            >
              Delete
            </PillButton>
          </div>
        ) : (
          <PillButton variant="destructive" onClick={() => setConfirming(true)}>
            Delete transaction
          </PillButton>
        )
      )}
    </div>
  )
}
