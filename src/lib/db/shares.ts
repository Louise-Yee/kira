import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PublicReceipt } from './types'

/** A public receipt by link id: undefined while loading, null if it doesn't exist (deleted, mistyped) or can't be read. */
export function usePublicReceipt(id: string) {
  const [state, setState] = useState<{ id: string; receipt: PublicReceipt | null }>()
  useEffect(() => {
    let live = true
    getDoc(doc(db, 'shares', id)).then(
      (s) => live && setState({ id, receipt: (s.data() as PublicReceipt | undefined) ?? null }),
      () => live && setState({ id, receipt: null }),
    )
    return () => {
      live = false
    }
  }, [id])
  return state?.id === id ? state.receipt : undefined
}
