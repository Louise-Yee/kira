import { useEffect, useState } from 'react'
import type { Query } from 'firebase/firestore'
import { listen } from './core'
import type { WithId } from './types'

/**
 * Live query results; undefined until the first snapshot (cache-first, so instant when offline).
 * `serverOnly` ignores cache-served snapshots, so it stays undefined until the server has answered.
 */
export function useDocs<T>(q: Query<T> | null, serverOnly = false): WithId<T>[] | undefined {
  const [state, setState] = useState<{ q: Query<T>; docs: WithId<T>[] }>()
  useEffect(() => {
    if (!q) return
    return listen(
      q,
      // Without metadata changes, a cache snapshot the server confirms unchanged never fires again.
      { includeMetadataChanges: serverOnly },
      (snap) => {
        if (serverOnly && snap.metadata.fromCache) return
        setState({ q, docs: snap.docs.map((d) => ({ ...d.data(), id: d.id })) })
      },
    )
  }, [q, serverOnly])
  // Ignore a snapshot that belongs to a previous query (e.g. the month just switched).
  return state?.q === q ? state.docs : undefined
}
