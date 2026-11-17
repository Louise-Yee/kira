import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { reportError, settingsRef } from './core'
import type { Settings } from './types'

/** undefined = loading, null = no settings document yet. */
export function useSettings(uid: string) {
  const [state, setState] = useState<{ uid: string; settings: Settings | null }>()
  useEffect(
    () => onSnapshot(settingsRef(uid), (s) => setState({ uid, settings: s.data() ?? null }), reportError),
    [uid],
  )
  return state?.uid === uid ? state.settings : undefined
}
