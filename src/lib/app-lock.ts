import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { BiometryType, NativeBiometric } from '@capgo/capacitor-native-biometric'

const KEY = 'kira.appLock'

/** Android app only: the web build has no plugin, so the lock is hidden there. */
export const lockSupported = Capacitor.isNativePlatform()

/** Fingerprint, face, or the phone's own PIN/pattern in the same system prompt. True on success. */
async function verify(title: string): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      title,
      allowedBiometryTypes: [BiometryType.FINGERPRINT, BiometryType.FACE_AUTHENTICATION, BiometryType.DEVICE_CREDENTIAL],
    })
    return true
  } catch {
    return false // cancelled, failed or no screen lock set on the phone
  }
}

/**
 * Opt-in lock. `unlocked` lives in memory only, so every cold start (hard close or Android killing
 * the process) asks again, while just switching apps does not.
 */
export function useAppLock() {
  const [enabled, setEnabled] = useState<boolean | undefined>(lockSupported ? undefined : false)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    if (lockSupported) Preferences.get({ key: KEY }).then((r) => setEnabled(r.value === '1'))
  }, [])

  const unlock = useCallback(async () => {
    if (await verify('Unlock kira')) setUnlocked(true)
  }, [])

  /** Turning it on or off both need a successful prompt first. Returns whether it changed. */
  const set = useCallback(async (on: boolean) => {
    if (!(await verify(on ? 'Turn on app lock' : 'Turn off app lock'))) return false
    if (on) await Preferences.set({ key: KEY, value: '1' })
    else await Preferences.remove({ key: KEY })
    setEnabled(on)
    return true
  }, [])

  /** Escape hatch for the lock screen (e.g. the phone's screen lock was removed): clears the lock. */
  const reset = useCallback(async () => {
    await Preferences.remove({ key: KEY })
    setEnabled(false)
  }, [])

  return { enabled, unlocked, unlock, set, reset }
}

export type AppLock = ReturnType<typeof useAppLock>
