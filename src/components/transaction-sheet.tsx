import { DatePicker } from '@/components/date-picker'
import { useState } from 'react'
import { EntryFields, type Entry } from '@/components/entry-fields'
import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import { success, warning } from '@/lib/haptics'
import { todayISO } from '@/lib/date'
import { useDisplayCurrency } from '@/lib/display-currency'
import { useRate } from '@/lib/fx'
import { entered, toHome } from '@/lib/money'
import { toast } from '@/lib/toast'
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
    <Sheet open={open} onClose={onClose} title={initial ? 'Edit transaction' : 'New transaction'} size="full">
      {/* Mounted only while open, so the form starts fresh each time. */}
      <Form initial={initial} onClose={onClose} {...rest} />
    </Sheet>
  )
}

function Form({ initial, categories, onSave, onDelete, onClose }: Omit<Props, 'open'>) {
  const display = useDisplayCurrency()
  const [entry, setEntry] = useState<Entry>({
    kind: initial?.kind ?? 'expense',
    ...entered(initial, display),
    categoryId: initial?.categoryId ?? null,
    note: initial?.note ?? '',
  })
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const fetched = useRate(entry.currency, date)
  const money = toHome(entry.amount, entry.currency, entry.rate ?? fetched.rate)

  // null until the form can be saved (amount entered, a rate for a foreign one, category picked, date set).
  const draft: TransactionDraft | null =
    money && money.amount > 0 && entry.categoryId && date
      ? { kind: entry.kind, ...money, categoryId: entry.categoryId, date, note: entry.note.trim() }
      : null
  const badge = initial?.recurringId ? 'Recurring' : initial?.splitId ? 'Split' : initial?.groupId ? 'Group' : null

  return (
    <div className="flex flex-col gap-4 pb-1">
      <SheetActions
        disabled={!draft}
        onSave={() => {
          if (!draft) return
          success()
          onSave(draft)
          toast('Saved')
          onClose()
        }}
        onDelete={
          initial && onDelete
            ? () => {
                warning()
                onDelete()
                onClose()
              }
            : undefined
        }
        deleteLabel="Delete transaction"
        // Undo on the toast replaces asking first.
        confirmDelete={false}
      />
      {badge && (
        <span className="w-fit rounded-full bg-accent px-3 py-1 text-base font-semibold text-accent-foreground">
          {badge}
        </span>
      )}
      <EntryFields value={entry} onChange={setEntry} categories={categories} keepCategoryId={initial?.categoryId} fetched={fetched} autoFocus>
        <DatePicker value={date} onChange={setDate} aria-label="Date" />
      </EntryFields>
    </div>
  )
}
