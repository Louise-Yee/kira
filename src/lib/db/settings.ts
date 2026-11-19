import { useEffect, useState } from 'react'
import { deleteField, onSnapshot, setDoc } from 'firebase/firestore'
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

/** Set the payment QR (a compressed data URL), or remove it with null. Never awaited, like every write. */
export function setPaymentQr(uid: string, dataUrl: string | null) {
  void setDoc(settingsRef(uid), { tngQr: dataUrl ?? deleteField() }, { merge: true }).catch(reportError)
}

/** Let friends find this account by email (or not). The directory entry follows in `useDirectoryPublisher`. */
export function setDiscoverable(uid: string, on: boolean) {
  void setDoc(settingsRef(uid), { discoverable: on }, { merge: true }).catch(reportError)
}
