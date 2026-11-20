// The one entry point for Firestore access: import from '@/lib/db', never from the files inside.
export type { Category, DirectoryEntry, Kind, PublicReceipt, Recurring, RecurringDraft, Settings, Split, SplitDraft, SyncStatus, Transaction, TransactionDraft, WithId } from './types'
export { col, newId, save, settingsRef } from './core'
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
export { exportBackup, importBackup } from './backup'
export { usePublicReceipt } from './shares'
export { findByEmails, useDirectoryPublisher } from './directory'
export { EXPENSES_PAGE, deleteGroupExpense, saveGroupExpense, useOlderExpenses, useRecentExpenses } from './group-expenses'
export { setGroupLog, useDefaultGroupLogs, useGroupAutoLog, useGroupLogs } from './group-autolog'
export type { GroupLog } from '@/lib/group-autolog'
export {
  confirmSettlement,
  dismissSettlement,
  rejectSettlement,
  settleUp,
  takeBackSettlement,
  useOlderSettlements,
  usePendingForMe,
  usePendingSettlements,
  useRecentSettlements,
  useRejectedSettlements,
  type PendingForMe,
} from './group-settlements'
export {
  acceptGroupInvite,
  cancelGroupInvite,
  createGroup,
  deleteGroup,
  inviteToGroup,
  joinGroup,
  leaveGroup,
  newInvite,
  renameGroup,
  revokeInvite,
  useGroupInvites,
  useGroups,
  useInvite,
} from './groups'
export { acceptFriendRequest, removeFriendship, sendFriendRequest, useFriendships, type Me } from './friends'
export type { Group, Invite } from '@/lib/groups'
export { setDiscoverable, setPaymentQr, useSettings } from './settings'
export { createShare, deleteSplit, saveSplit, SPLITS_PAGE, useOlderSplits, useRecentSplits } from './splits'
export { useSyncStatus } from './sync'
export { useClientInfo } from './client'
