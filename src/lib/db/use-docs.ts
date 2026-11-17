import { useEffect, useState } from 'react'
import { onSnapshot, type Query } from 'firebase/firestore'
import { reportError } from './core'
import type { WithId } from './types'

/** Live query results; undefined until the first snapshot (cache-first, so instant when offline). */
export function useDocs<T>(q: Query<T> | null): WithId<T>[] | undefined {
  const [state, setState] = useState<{ q: Query<T>; docs: WithId<T>[] }>()
  useEffect(() => {
    if (!q) return
    return onSnapshot(
      q,
      (snap) => setState({ q, docs: snap.docs.map((d) => ({ ...d.data(), id: d.id })) }),
      reportError,
    )
  }, [q])
  // Ignore a snapshot that belongs to a previous query (e.g. the month just switched).
  return state?.q === q ? state.docs : undefined
}
