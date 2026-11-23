import type { ReactNode } from 'react'
import { AmountInput } from '@/components/amount-input'
import { CategoryPicker } from '@/components/category-picker'
import { RateField } from '@/components/rate-field'
import { Segmented } from '@/components/segmented'
import { TextField } from '@/components/text-field'
import type { Category, Kind, WithId } from '@/lib/db'
import type { Entry } from '@/lib/entry'
import { HOME } from '@/lib/money'

type Props = {
  value: Entry
  onChange: (value: Entry) => void
  categories: readonly WithId<Category>[]
  /** An archived category stays pickable when it is the one already in use. */
  keepCategoryId?: string
  autoFocus?: boolean
  /** The rate for `value.currency`, from `useRate`. */
  fetched: { rate: number | null; loading: boolean }
  /** Rendered between the category and the note (the transaction's date). */
  children?: ReactNode
}

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const satisfies readonly { value: Kind; label: string }[]

/** The fields a transaction and a recurring rule share: kind, amount, category, note. */
export function EntryFields({ value, onChange, categories, keepCategoryId, autoFocus, fetched, children }: Props) {
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
      <AmountInput
        value={value.amount}
        onChange={(amount) => onChange({ ...value, amount })}
        currency={value.currency}
        onCurrency={(currency) => onChange({ ...value, currency, rate: null })}
        autoFocus={autoFocus}
      />
      {value.currency !== HOME && (
        <RateField
          key={value.currency}
          currency={value.currency}
          value={value.rate}
          onChange={(rate) => onChange({ ...value, rate })}
          fetched={fetched}
          amount={value.amount}
        />
      )}
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
