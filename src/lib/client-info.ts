// Pure logic for the per-user client info document. No React, no Firebase.

export type ClientInfo = {
  appVersion: string
  platform: string // 'android' | 'web' (Capacitor.getPlatform())
  os: string | null // 'Android 17', 'iOS 18.1', 'Windows', 'macOS', 'Linux'
  model: string | null // Android only: the device code, e.g. 'SM-S918B'
  locale: string
  timeZone: string
}

/** OS and device model from a user agent. Android WebViews send the real model; Chrome sends 'K', which we drop. */
export function parseUserAgent(ua: string): { os: string | null; model: string | null } {
  const android = /Android (\d+(?:\.\d+)*)(?:; ([^;)]+?))?(?: Build\/[^;)]*)?[;)]/.exec(ua)
  if (android) {
    const model = android[2]?.trim()
    return { os: `Android ${android[1]}`, model: model && model !== 'K' ? model : null }
  }
  const ios = /(?:iPhone|iPad|CPU) OS (\d+(?:_\d+)*)/.exec(ua)
  if (ios) return { os: `iOS ${ios[1].replaceAll('_', '.')}`, model: null }
  if (/Windows/.test(ua)) return { os: 'Windows', model: null }
  if (/Mac OS X|Macintosh/.test(ua)) return { os: 'macOS', model: null }
  if (/Linux|CrOS/.test(ua)) return { os: 'Linux', model: null }
  return { os: null, model: null }
}

/** Refresh at least this often, so `lastSeen` still means "active recently" while writes stay rare. */
export const REFRESH_MS = 7 * 24 * 60 * 60 * 1000

export type CachedClientInfo = { info: ClientInfo; at: number }

const same = (a: ClientInfo, b: ClientInfo) =>
  a.appVersion === b.appVersion &&
  a.platform === b.platform &&
  a.os === b.os &&
  a.model === b.model &&
  a.locale === b.locale &&
  a.timeZone === b.timeZone

/** Write when anything changed, or the last write is older than REFRESH_MS. */
export function needsWrite(prev: CachedClientInfo | null, next: ClientInfo, now: number): boolean {
  return !prev || !same(prev.info, next) || now - prev.at >= REFRESH_MS
}
