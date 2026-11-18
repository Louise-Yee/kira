// Pure version logic for the in-app update check. No React, no Capacitor.

type Semver = readonly [number, number, number]

/** "1.2.3" or "v1.2.3" → [1, 2, 3]; anything else → null. */
export function parseVersion(s: string): Semver | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(s.trim())
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

/** a > b. False when either isn't a valid version, so a bad tag never prompts. */
export function isNewer(a: string, b: string): boolean {
  const x = parseVersion(a)
  const y = parseVersion(b)
  if (!x || !y) return false
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

/** The `<!-- min-version: X.Y.Z -->` line CI writes into release notes. */
export function minVersionFrom(body: string | null): string | null {
  const m = body && /<!--\s*min-version:\s*(\S+?)\s*-->/.exec(body)
  return m && parseVersion(m[1]) ? m[1] : null
}

/** The fields we use from GitHub's GET /repos/{owner}/{repo}/releases/latest. */
export type GitHubRelease = {
  tag_name?: string
  body?: string | null
  assets?: { name?: string; browser_download_url?: string }[]
}

export type Release = { version: string; apkUrl: string; minVersion: string | null }

export function parseRelease(r: GitHubRelease): Release | null {
  const version = r.tag_name?.replace(/^v/, '')
  const apkUrl = r.assets?.find((a) => a.name?.endsWith('.apk'))?.browser_download_url
  if (!version || !parseVersion(version) || !apkUrl) return null
  return { version, apkUrl, minVersion: minVersionFrom(r.body ?? null) }
}

export type UpdateKind = 'none' | 'optional' | 'forced'

export function updateKind(installed: string, release: Release): UpdateKind {
  if (!isNewer(release.version, installed)) return 'none'
  return release.minVersion && isNewer(release.minVersion, installed) ? 'forced' : 'optional'
}
