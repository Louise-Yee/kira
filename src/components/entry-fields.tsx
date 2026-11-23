import type { ReactNode } from 'react'
import { AmountInput } from '@/components/amount-input'
import { CategoryChips } from '@/components/category-chips'
import { RateField } from '@/components/rate-field'
import { TextField } from '@/components/text-field'
import type { Category, WithId } from '@/lib/db'
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

/** The fields a transaction and a recurring rule share: amount, category, note. The category sets the kind (expense or income). */
export function EntryFields({ value, onChange, categories, keepCategoryId, autoFocus, fetched, children }: Props) {
  const choices = categories.filter((c) => !c.archived || c.id === keepCategoryId)
  return (
    <>
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
      <CategoryChips
        categories={choices}
        value={value.categoryId}
        onChange={(categoryId) => onChange({ ...value, categoryId, kind: choices.find((c) => c.id === categoryId)?.kind ?? value.kind })}
      />
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
