import { Capacitor } from '@capacitor/core'

/** Whether this browser has a system share sheet for links (phones), as opposed to copying. */
export const canShareLinks = (): boolean => typeof navigator.share === 'function'

/** The public address of a receipt link. In the app `location.origin` is the app's own https://localhost, so use the hosted site. */
export const receiptUrl = (shareId: string): string =>
  `${Capacitor.isNativePlatform() ? `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.web.app` : location.origin}/r/${shareId}`

/** Open the share sheet with the link where there is one, otherwise copy it. Call straight from a tap. */
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (canShareLinks()) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled' // the user closed the share sheet
      // anything else (a browser that refuses): fall through to copying
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
