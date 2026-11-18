import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { setDoc } from 'firebase/firestore'
import { needsWrite, parseUserAgent, type CachedClientInfo, type ClientInfo } from '@/lib/client-info'
import { APP_VERSION } from '@/lib/update'
import { clientRef, reportError } from './core'

const cacheKey = (uid: string) => `kira.clientInfo.${uid}`

function readCache(uid: string): CachedClientInfo | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid))
    return raw ? (JSON.parse(raw) as CachedClientInfo) : null
  } catch {
    return null
  }
}

/**
 * Records which app version and device this account uses (users/{uid}/meta/client), to see who still runs old APKs.
 * Writes only when something changed or once a week, never on every launch.
 */
export function useClientInfo(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return
    const intl = Intl.DateTimeFormat().resolvedOptions()
    const info: ClientInfo = {
      appVersion: APP_VERSION,
      platform: Capacitor.getPlatform(),
      ...parseUserAgent(navigator.userAgent),
      locale: intl.locale,
      timeZone: intl.timeZone,
    }
    const now = Date.now()
    if (!needsWrite(readCache(uid), info, now)) return
    void setDoc(clientRef(uid), { ...info, lastSeen: now }).catch(reportError)
    try {
      localStorage.setItem(cacheKey(uid), JSON.stringify({ info, at: now } satisfies CachedClientInfo))
    } catch {
      // storage blocked: we just write again next launch
    }
  }, [uid])
}
