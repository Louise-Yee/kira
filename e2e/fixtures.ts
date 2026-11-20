import { createHash } from 'node:crypto'
import { test as base, expect, type Page } from '@playwright/test'

export { expect }

export type User = { name: string; email: string; page: Page }

/** Requests that would reach a real Firebase project. Every test context refuses them, as a second lock behind demo-kira. */
// Matched on the host: the emulators serve the same API names as paths (127.0.0.1:9099/identitytoolkit.googleapis.com/…).
const LIVE_FIREBASE = /^https:\/\/((identitytoolkit|securetoken|firestore|firebaseinstallations)\.googleapis\.com|[^/]+\.firebaseapp\.com|[^/]+\.web\.app)\//

/** Console lines that mean a listener or write was refused. Any of them fails the test, unless it is a known issue. */
const FIRESTORE_ERROR = /\[firestore\]|Missing or insufficient permissions|evaluation error/i

/**
 * Lets a test pass while a known bug still logs Firestore errors. Remove the call once the issue is fixed:
 * the errors then fail the test again.
 */
export function knownFirestoreErrors(issue: string) {
  test.info().annotations.push({ type: 'known-firestore-errors', description: issue })
}

type Fixtures = {
  /**
   * Opens a fresh browser as a new person, signed in with Google on the Auth emulator, at `path`.
   * `signedOutFirst` opens `path` signed out first (sign-in screen), then signs in on the same address.
   */
  signIn: (name: string, options?: { path?: string; signedOutFirst?: boolean }) => Promise<User>
}

const AUTH = 'http://127.0.0.1:9099'
const API_KEY = 'demo-key'

/** The user record the Firebase Auth SDK keeps in IndexedDB. */
type StoredUser = {
  uid: string
  email: string
  emailVerified: boolean
  displayName: string
  isAnonymous: boolean
  photoURL: null
  providerData: { providerId: string; uid: string; displayName: string; email: string; phoneNumber: null; photoURL: null }[]
  stsTokenManager: { refreshToken: string; accessToken: string; expirationTime: number }
  createdAt: string
  lastLoginAt: string
  apiKey: string
  appName: string
}
type Session = { key: string; value: StoredUser }

/**
 * Signs in with Google on the Auth emulator's REST API (it accepts an unsigned ID token) and returns the user record
 * the Firebase SDK stores. This replaces the emulator's popup, which loads Google's gapi from the internet and is flaky.
 */
async function googleSession(name: string, email: string): Promise<Session> {
  const idToken = JSON.stringify({ sub: email, email, email_verified: true, name })
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
      requestUri: 'http://localhost',
      returnSecureToken: true,
    }),
  })
  if (!res.ok) throw new Error(`Emulator sign-in failed: ${res.status} ${await res.text()}`)
  const r = (await res.json()) as { localId: string; idToken: string; refreshToken: string; expiresIn: string }
  const now = Date.now()
  return {
    key: `firebase:authUser:${API_KEY}:[DEFAULT]`,
    value: {
      uid: r.localId,
      email,
      emailVerified: true,
      displayName: name,
      isAnonymous: false,
      photoURL: null,
      providerData: [{ providerId: 'google.com', uid: email, displayName: name, email, phoneNumber: null, photoURL: null }],
      stsTokenManager: { refreshToken: r.refreshToken, accessToken: r.idToken, expirationTime: now + Number(r.expiresIn) * 1000 },
      createdAt: String(now),
      lastLoginAt: String(now),
      apiKey: API_KEY,
      appName: '[DEFAULT]',
    },
  }
}

/** Runs in the page: writes the session into the SDK's IndexedDB store. */
function saveSession({ key, value }: Session) {
  return new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('firebaseLocalStorageDb', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' })
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction('firebaseLocalStorage', 'readwrite')
      tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value })
      tx.oncomplete = () => {
        open.result.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

export const test = base.extend<Fixtures>({
  signIn: async ({ browser }, use, testInfo) => {
    const opened: { user: User; errors: string[]; log: string[] }[] = []
    // Unique per test, project and retry, so tests can run in parallel without clearing the emulators.
    const run = createHash('sha1').update(`${testInfo.testId}-${testInfo.retry}`).digest('hex').slice(0, 10)
    const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = testInfo.project.use

    await use(async (name, { path = '/', signedOutFirst = false } = {}) => {
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        viewport,
        userAgent,
        deviceScaleFactor,
        isMobile,
        hasTouch,
        reducedMotion: 'reduce',
        permissions: ['clipboard-read', 'clipboard-write'],
      })
      await context.route(LIVE_FIREBASE, (route) => route.abort())
      // Share links fall back to the clipboard, which the test can read back.
      await context.addInitScript(() => {
        Reflect.deleteProperty(Navigator.prototype, 'share')
      })
      const page = await context.newPage()
      const errors: string[] = []
      const log: string[] = []
      page.on('console', (m) => {
        log.push(`${m.type()}: ${m.text()}`)
        if (m.type() === 'error' && FIRESTORE_ERROR.test(m.text())) errors.push(m.text())
      })
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

      const user: User = { name, email: `${name.toLowerCase()}.${run}@kira.test`, page }
      opened.push({ user, errors, log })

      if (signedOutFirst) {
        await page.goto(path)
        await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
      }
      // Store the session where the Firebase SDK keeps it, on a blank page of the app's origin, then open the app.
      const session = await googleSession(name, user.email)
      await page.route('**/__e2e-blank', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }))
      await page.goto('/__e2e-blank')
      await page.evaluate(saveSession, session)
      await page.goto(path)
      // includeHidden: a sheet opened by the address (an invite link) hides the page behind it from the a11y tree.
      await expect(page.getByRole('button', { name: 'People', includeHidden: true })).toBeAttached()
      return user
    })

    const known = testInfo.annotations.some((a) => a.type === 'known-firestore-errors')
    const failed = testInfo.status !== testInfo.expectedStatus
    for (const { user, errors, log } of opened) {
      if (!known) expect.soft(errors, `Firestore errors in ${user.name}'s browser`).toEqual([])
      if (failed && !user.page.isClosed())
        await testInfo.attach(`${user.name}'s screen`, { body: await user.page.screenshot({ fullPage: true }), contentType: 'image/png' })
      if (failed) await testInfo.attach(`${user.name}'s console`, { body: [user.page.url(), ...log].join('\n'), contentType: 'text/plain' })
      await user.page.context().close()
    }
  },
})
