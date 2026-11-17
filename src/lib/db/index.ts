// The one entry point for Firestore access: import from '@/lib/db', never from the files inside.
export type { Category, Kind, Settings, SyncStatus, Transaction, TransactionDraft, WithId } from './types'
export { col, newId, remove, save, settingsRef } from './core'
export {
  categoryInUse,
  deleteCategory,
  moveAndDeleteCategory,
  saveCategory,
  swapCategoryOrder,
  useCategories,
} from './categories'
export { deleteTransaction, saveTransaction, useMonth } from './transactions'
export { useSettings } from './settings'
export { useSyncStatus } from './sync'
