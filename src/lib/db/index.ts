// The one entry point for Firestore access: import from '@/lib/db', never from the files inside.
export type { Category, Kind, Recurring, RecurringDraft, Settings, Split, SplitDraft, SyncStatus, Transaction, TransactionDraft, WithId } from './types'
export { col, newId, remove, save, settingsRef } from './core'
export {
  categoryInUse,
  deleteCategory,
  moveAndDeleteCategory,
  saveCategory,
  swapCategoryOrder,
  useCategories,
} from './categories'
export { deleteTransaction, saveTransaction, useMonth, useMonths } from './transactions'
export {
  countRecurringTransactions,
  deleteRecurring,
  postOccurrences,
  saveRecurring,
  useRecurring,
} from './recurring'
export { setPaymentQr, useSettings } from './settings'
export { deleteSplit, saveSplit, useSplits } from './splits'
export { useSyncStatus } from './sync'
