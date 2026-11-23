import { useEffect, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { parseRelease, updateKind, type GitHubRelease, type Release } from '@/lib/version'

/** From package.json at build time (vite.config.ts `define`). */
export const APP_VERSION = __APP_VERSION__

/** The dev APK (`app.kira.dev`), built by dev-apk.yml. It installs next to the live app and is reinstalled by hand. */
export const IS_DEV_BUILD = import.meta.env.VITE_APP_ENV === 'dev'

// Public repo: no token needed (60 requests an hour per IP; we make one per launch, plus at most one an hour on resume).
const LATEST_RELEASE = 'https://api.github.com/repos/Louise-Yee/kira/releases/latest'
const RECHECK_MS = 60 * 60 * 1000
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
 * Android only: on launch and on returning to the app (at most hourly), compare the installed version with GitHub's latest release.
 * The sheet opens by itself for a forced update, or for an optional one not yet put off with "Later".
 * The web app updates through its service worker, so it never checks.
 */
export function useUpdate() {
  const [update, setUpdate] = useState<Update | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // A dev build is never offered the live release.
    if (!Capacitor.isNativePlatform() || IS_DEV_BUILD) return
    let cancelled = false
    let lastCheck = 0
    const check = () => {
      lastCheck = Date.now()
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
          // offline or GitHub unreachable: check again on the next launch or resume
        })
    }
    check()
    // Also when the app comes back to the foreground, at most once an hour (GitHub allows 60 requests an hour per IP).
    const handle = CapApp.addListener('appStateChange', (s) => {
      if (s.isActive && Date.now() - lastCheck > RECHECK_MS) check()
    })
    return () => {
      cancelled = true
      handle.then((h) => h.remove())
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

const Updater = registerPlugin<{
  install: (o: { url: string }) => Promise<void>
  addListener: (e: 'progress', cb: (p: { percent: number }) => void) => Promise<PluginListenerHandle>
}>('Updater')

/**
 * Downloads the APK in the app (percent is -1 when the size is unknown), then Android's installer opens on it.
 * Resolves 'permission' when the user first has to allow installs from kira (we've sent them to that switch; retry after).
 */
export async function installUpdate(release: Release, onProgress: (percent: number) => void): Promise<'started' | 'permission'> {
  const handle = await Updater.addListener('progress', (p) => onProgress(p.percent))
  try {
    await Updater.install({ url: release.apkUrl })
    return 'started'
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'permission') return 'permission'
    throw e
  } finally {
    handle.remove()
  }
}
