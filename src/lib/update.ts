import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { parseRelease, updateKind, type GitHubRelease, type Release } from '@/lib/version'

/** From package.json at build time (vite.config.ts `define`). */
export const APP_VERSION = __APP_VERSION__

// Public repo: no token needed (60 requests an hour per IP; we make one per launch).
const LATEST_RELEASE = 'https://api.github.com/repos/Louise-Yee/kira/releases/latest'
const DISMISSED_KEY = 'kira.updateDismissed'

export type Update = { release: Release; forced: boolean }

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY)
  } catch {
    return null
  }
}

/**
 * Android only: on launch, compare the installed version with GitHub's latest release.
 * The sheet opens by itself for a forced update, or for an optional one not yet put off with "Later".
 * The web app updates through its service worker, so it never checks.
 */
export function useUpdate() {
  const [update, setUpdate] = useState<Update | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false
    fetch(LATEST_RELEASE, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GitHubRelease | null) => {
        const release = data && parseRelease(data)
        if (cancelled || !release) return
        const kind = updateKind(APP_VERSION, release)
        if (kind === 'none') return
        setUpdate({ release, forced: kind === 'forced' })
        if (kind === 'forced' || readDismissed() !== release.version) setOpen(true)
      })
      .catch(() => {
        // offline or GitHub unreachable: check again on the next launch
      })
    return () => {
      cancelled = true
    }
  }, [])

  const later = () => {
    if (!update || update.forced) return
    try {
      localStorage.setItem(DISMISSED_KEY, update.release.version)
    } catch {
      // storage blocked: the sheet just comes back next launch
    }
    setOpen(false)
  }

  return { update, open, show: () => setOpen(true), later }
}

/** Hands the APK link to the system browser, which downloads it; tapping the download installs it. */
export function downloadUpdate(release: Release) {
  // ponytail: relies on Capacitor sending off-app URLs to the system browser; @capacitor/browser if a device disagrees.
  window.open(release.apkUrl, '_blank')
}
