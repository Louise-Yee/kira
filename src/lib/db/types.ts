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
  occurrence?: string
  splitId?: string
  /** Epoch ms (not serverTimestamp, which reads back null while a write is pending). */
  createdAt: number
  updatedAt: number
}

export type Settings = {
  currency: 'MYR'
  createdAt: number
  tngQr?: string
}

export type WithId<T> = T & { id: string }

/** What the add/edit form produces; ids and timestamps are added on save. */
export type TransactionDraft = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'date' | 'note'>

export type SyncStatus = 'offline' | 'saving' | 'synced'
