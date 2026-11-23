import type { ClientInfo } from '@/lib/client-info'
import type { Original } from '@/lib/money'
import type { Deletion } from '@/lib/deletion'
import type { RecurrenceRule } from '@/lib/recurrence'
import type { Receipt } from '@/lib/receipt-data'
import type { Charge, Share, SplitForm, SplitItem, SplitMode, SplitFriend } from '@/lib/split'

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
} & Deletion

export type Transaction = {
  kind: Kind
  /** Integer sen (the RM value, also for a foreign one). */
  amount: number
  /** Set when it was entered in another currency. Absent means RM. */
  original?: Original
  categoryId: string
  /** Local YYYY-MM-DD. */
  date: string
  note: string
  recurringId?: string
  /** Index of the recurring occurrence this was posted for. */
  occurrence?: number
  splitId?: string
  /** Set on a transaction made from my share of a group expense (see group-autolog). */
  groupId?: string
  groupExpenseId?: string
  /** Epoch ms (not serverTimestamp, which reads back null while a write is pending). */
  createdAt: number
  updatedAt: number
} & Deletion

/** A recurring rule. `posted` = how many occurrences already exist (the next index to post). */
export type Recurring = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'note' | 'original'> &
  RecurrenceRule & { posted: number; createdAt: number } & Deletion

/** What the rule form produces; `posted` and `createdAt` are managed by the db layer. */
export type RecurringDraft = Omit<Recurring, 'posted' | 'createdAt' | keyof Deletion>

/** A bill split between people. `people[0]` is me; `shares` are stored as fixed values, never recomputed. */
export type Split = {
  title: string
  /** Local YYYY-MM-DD. */
  date: string
  mode: SplitMode
  /** Set when the bill is in another currency: every amount on the split is in its minor unit. Absent means RM. */
  currency?: string
  /** RM per 1 unit of `currency`, used for my expense. Set with `currency`. */
  rate?: number
  people: string[]
  /** People who are my friends on kira, by person index (absent on older splits). */
  friends?: Record<string, SplitFriend>
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
} & Deletion

/** A public receipt for one person (`shares/{id}`, readable by anyone with the id). It holds only that person's rows. */
export type PublicReceipt = {
  uid: string
  splitId: string
  person: number
  receipt: Receipt
  createdAt: number
  updatedAt: number
} & Deletion

/** What the editor produces; shares, the expense id and timestamps are added on save. */
export type SplitDraft = { title: string; date: string; categoryId: string; form: SplitForm } & Partial<Pick<Split, 'currency' | 'rate'>>

export type Settings = {
  currency: 'MYR'
  createdAt: number
  tngQr?: string
  /** Friends can find this account by email. Missing means on. */
  discoverable?: boolean
}

/** directory/{email}: how a friend's contact list finds this account. Holds only what a friend request shows. */
export type DirectoryEntry = { uid: string; displayName: string; photoURL: string | null }

/** users/{uid}/meta/client: the app version and device last used. lastSeen is refreshed at least weekly. */
export type ClientDoc = ClientInfo & { lastSeen: number }

export type WithId<T> = T & { id: string }

/** What the add/edit form produces; ids and timestamps are added on save. */
export type TransactionDraft = Pick<Transaction, 'kind' | 'amount' | 'original' | 'categoryId' | 'date' | 'note'>

