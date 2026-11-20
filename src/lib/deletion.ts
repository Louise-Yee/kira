/**
 * Soft delete: nothing a person deletes is removed from the database. It gets `deletedAt` (and, on shared docs,
 * `deletedBy`) and the db hooks leave it out. Undo removes both fields again. Kept forever, for auditing.
 */
export type Deletion = { deletedAt?: number; deletedBy?: string }
