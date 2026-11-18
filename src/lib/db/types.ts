import type { RecurrenceRule } from '@/lib/recurrence'
import type { Receipt } from '@/lib/receipt-data'
import type { Charge, Share, SplitForm, SplitItem, SplitMode } from '@/lib/split'

export type Kind = 'expense' | 'income'

export type Category = {
  name: string
  kind: Kind
  /** Token name from index.css (`cat-1`..`cat-8`), not a hex value. */
  color: string
  /** Name from the category-icon list. */
  icon: string
  order: number
  archived: boolean
}

export type Transaction = {
  kind: Kind
  /** Integer sen. */
  amount: number
  categoryId: string
  /** Local YYYY-MM-DD. */
  date: string
  note: string
  recurringId?: string
  /** Index of the recurring occurrence this was posted for. */
  occurrence?: number
  splitId?: string
  /** Epoch ms (not serverTimestamp, which reads back null while a write is pending). */
  createdAt: number
  updatedAt: number
}

/** A recurring rule. `posted` = how many occurrences already exist (the next index to post). */
export type Recurring = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'note'> &
  RecurrenceRule & { posted: number; createdAt: number }

/** What the rule form produces; `posted` and `createdAt` are managed by the db layer. */
export type RecurringDraft = Omit<Recurring, 'posted' | 'createdAt'>

/** A bill split between people. `people[0]` is me; `shares` are stored as fixed values, never recomputed. */
export type Split = {
  title: string
  /** Local YYYY-MM-DD. */
  date: string
  mode: SplitMode
  people: string[]
  /** Always the items the maths ran on (even and exact modes are stored as items too). */
  items: SplitItem[]
  charges: Charge
  shares: Share[]
  /** Category of my expense. */
  categoryId: string
  /** `{splitId}_me`, or null when my share is 0 (no expense is created). */
  expenseTxId: string | null
  /** Receipt links by person index: the id of that person's doc in `shares`. */
  shareIds?: Record<string, string>
  createdAt: number
  updatedAt: number
}

/** A public receipt for one person (`shares/{id}`, readable by anyone with the id). It holds only that person's rows. */
export type PublicReceipt = {
  uid: string
  splitId: string
  person: number
  receipt: Receipt
  createdAt: number
  updatedAt: number
}

/** What the editor produces; shares, the expense id and timestamps are added on save. */
export type SplitDraft = { title: string; date: string; categoryId: string; form: SplitForm }

export type Settings = {
  currency: 'MYR'
  createdAt: number
  tngQr?: string
}

export type WithId<T> = T & { id: string }

/** What the add/edit form produces; ids and timestamps are added on save. */
export type TransactionDraft = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'date' | 'note'>

export type SyncStatus = 'offline' | 'saving' | 'synced'
