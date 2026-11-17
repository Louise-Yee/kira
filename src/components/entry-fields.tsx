import type { ReactNode } from 'react'
import { AmountInput } from '@/components/amount-input'
import { CategoryPicker } from '@/components/category-picker'
import { Segmented } from '@/components/segmented'
import { TextField } from '@/components/text-field'
import type { Category, Kind, WithId } from '@/lib/db'

export type Entry = { kind: Kind; amount: number; categoryId: string | null; note: string }

type Props = {
  value: Entry
  onChange: (value: Entry) => void
  categories: readonly WithId<Category>[]
  /** An archived category stays pickable when it is the one already in use. */
  keepCategoryId?: string
  autoFocus?: boolean
  /** Rendered between the category and the note (the transaction's date). */
  children?: ReactNode
}

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const satisfies readonly { value: Kind; label: string }[]

/** The fields a transaction and a recurring rule share: kind, amount, category, note. */
export function EntryFields({ value, onChange, categories, keepCategoryId, autoFocus, children }: Props) {
  const choices = categories.filter((c) => c.kind === value.kind && (!c.archived || c.id === keepCategoryId))
  return (
    <>
      <Segmented
        options={kindOptions}
        value={value.kind}
        onChange={(kind) =>
          // A category belongs to one kind: drop the pick if it no longer fits.
          onChange({
            ...value,
            kind,
            categoryId: categories.find((c) => c.id === value.categoryId)?.kind === kind ? value.categoryId : null,
          })
        }
      />
      <AmountInput value={value.amount} onChange={(amount) => onChange({ ...value, amount })} autoFocus={autoFocus} />
      <CategoryPicker categories={choices} value={value.categoryId} onChange={(categoryId) => onChange({ ...value, categoryId })} />
      {children}
      <TextField
        value={value.note}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        placeholder="Note (optional)"
        aria-label="Note"
        maxLength={200}
      />
    </>
  )
}
