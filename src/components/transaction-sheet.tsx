import { useState } from 'react'
import { EntryFields, type Entry } from '@/components/entry-fields'
import { PillButton } from '@/components/pill-button'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { todayISO } from '@/lib/date'
import type { Category, Transaction, TransactionDraft, WithId } from '@/lib/db'

type Props = {
  open: boolean
  onClose: () => void
  categories: readonly WithId<Category>[]
  /** Set to edit an existing transaction; omit to add. */
  initial?: WithId<Transaction>
  onSave: (draft: TransactionDraft) => void
  onDelete?: () => void
}

export function TransactionSheet({ open, onClose, initial, ...rest }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Edit transaction' : 'New transaction'}>
      {/* Mounted only while open, so the form starts fresh each time. */}
      <Form initial={initial} onClose={onClose} {...rest} />
    </Sheet>
  )
}

function Form({ initial, categories, onSave, onDelete, onClose }: Omit<Props, 'open'>) {
  const [entry, setEntry] = useState<Entry>({
    kind: initial?.kind ?? 'expense',
    amount: initial?.amount ?? 0,
    categoryId: initial?.categoryId ?? null,
    note: initial?.note ?? '',
  })
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [confirming, setConfirming] = useState(false)

  // null until the form can be saved (amount entered, category picked, date set).
  const draft: TransactionDraft | null =
    entry.amount > 0 && entry.categoryId && date
      ? { kind: entry.kind, amount: entry.amount, categoryId: entry.categoryId, date, note: entry.note.trim() }
      : null
  const badge = initial?.recurringId ? 'Recurring' : initial?.splitId ? 'Split' : null

  return (
    <div className="flex flex-col gap-4 pb-1">
      {badge && (
        <span className="w-fit rounded-full bg-accent px-3 py-1 text-base font-semibold text-accent-foreground">
          {badge}
        </span>
      )}
      <EntryFields value={entry} onChange={setEntry} categories={categories} keepCategoryId={initial?.categoryId} autoFocus>
        <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      </EntryFields>
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
