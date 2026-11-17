import { useEffect } from 'react'
import { doc, getDocFromServer, writeBatch } from 'firebase/firestore'
import { col, settingsRef } from '@/lib/db'
import { defaultCategories } from '@/lib/default-categories'
import { db } from '@/lib/firebase'

/**
 * First sign-in on a new account: write settings/main and the default categories in one batch.
 * Asks the server, not the cache, so an offline device never mistakes "can't tell" for "missing";
 * if the server is unreachable it skips and tries again on the next load.
 */
export function useSeedDefaults(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    getDocFromServer(settingsRef(uid)).then(
      (snap) => {
        if (cancelled || snap.exists()) return
        const batch = writeBatch(db)
        batch.set(settingsRef(uid), { currency: 'MYR', createdAt: Date.now() })
        for (const { id, ...category } of defaultCategories) batch.set(doc(col(uid, 'categories'), id), category)
        // Not awaited: offline-first, the commit only resolves once the server acks it.
        void batch.commit().catch((e: Error) => console.error('[seed]', e))
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [uid])
}
