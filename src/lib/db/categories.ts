import { useMemo } from 'react'
import { doc, getDocsFromServer, limit, orderBy, query, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { col, liveDocs, newId, reportError, save, softDelete } from './core'
import type { Category, WithId } from './types'
import { useDocs } from './use-docs'

export const categoriesQuery = (uid: string) => query(col(uid, 'categories'), orderBy('order'))

export function useCategories(uid: string) {
  const q = useMemo(() => categoriesQuery(uid), [uid])
  return useDocs(q)
}

/** Create (no `id`) or overwrite a category. */
export function saveCategory(uid: string, data: Category, id?: string) {
  save(doc(col(uid, 'categories'), id ?? newId(uid, 'categories')), data)
}

/** Swap the sort positions of two categories in one batch, so a reorder is never half-applied. */
export function swapCategoryOrder(uid: string, a: WithId<Category>, b: WithId<Category>) {
  const batch = writeBatch(db)
  batch.update(doc(col(uid, 'categories'), a.id), { order: b.order })
  batch.update(doc(col(uid, 'categories'), b.id), { order: a.order })
  void batch.commit().catch(reportError)
}

/**
 * Does any (not deleted) transaction use this category? Asks the server, never the cache: a partial cache could say
 * "no" and let a used category be deleted. Rejects when offline, so callers must treat that as "unknown".
 * Firestore can't query for a missing `deletedAt`, so it reads a few at a time until it finds a live one.
 */
export async function categoryInUse(uid: string, id: string): Promise<boolean> {
  const snap = await getDocsFromServer(query(col(uid, 'transactions'), where('categoryId', '==', id), limit(20)))
  // ponytail: 20 deleted ones in a row reads as "in use"; the move flow then just moves them too.
  return liveDocs(snap).length > 0 || snap.size === 20
}

/** Soft-delete a category. Returns the undo. */
export const deleteCategory = (uid: string, id: string) => softDelete(doc(col(uid, 'categories'), id))

/**
 * Re-point every transaction of `fromId` to `toId`, then delete `fromId`.
 * The returned promise covers only the server read (rejects offline, nothing changed). The batches and the
 * delete run detached, and the delete waits for every batch, so a failed move never deletes the category.
 */
export async function moveAndDeleteCategory(uid: string, fromId: string, toId: string): Promise<void> {
  const snap = await getDocsFromServer(query(col(uid, 'transactions'), where('categoryId', '==', fromId)))
  const now = Date.now()
  const commits: Promise<void>[] = []
  for (let i = 0; i < snap.docs.length; i += 450) {
    // A batch holds at most 500 writes.
    const batch = writeBatch(db)
    for (const d of snap.docs.slice(i, i + 450)) batch.update(d.ref, { categoryId: toId, updatedAt: now })
    commits.push(batch.commit())
  }
  void Promise.all(commits)
    .then(() => void deleteCategory(uid, fromId))
    .catch(reportError)
}
