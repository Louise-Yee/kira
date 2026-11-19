import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

/** Opens a tapped receipt or group invite link (https://…/r/id, /join/token) inside the app, on a cold start and while it is running. Native only. */
export function useReceiptLink() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const open = (url: string) => {
      const { pathname } = new URL(url)
      if (pathname.startsWith('/r/') || pathname.startsWith('/join/')) navigate(pathname)
    }
    CapApp.getLaunchUrl().then((r) => r && open(r.url))
    const handle = CapApp.addListener('appUrlOpen', (e) => open(e.url))
    return () => {
      handle.then((h) => h.remove())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once; navigate is stable enough for this
  }, [])
}
