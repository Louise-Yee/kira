import type { RecurrenceRule } from '@/lib/recurrence'

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

export type Settings = {
  currency: 'MYR'
  createdAt: number
  tngQr?: string
}

export type WithId<T> = T & { id: string }

/** What the add/edit form produces; ids and timestamps are added on save. */
export type TransactionDraft = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'date' | 'note'>

export type SyncStatus = 'offline' | 'saving' | 'synced'
