import { BASE_URL } from '../playwright.config.ts'

// Start every run from empty emulators. Only the local demo- project is ever touched.
const PROJECT = 'demo-kira'

export default async function globalSetup() {
  // Refuse to run against anything but the e2e build: Vite inlines the env into each module it serves.
  const served = await (await fetch(`${BASE_URL}/src/lib/firebase.ts`)).text()
  if (!served.includes(`"VITE_FIREBASE_PROJECT_ID": "${PROJECT}"`) || !served.includes('"VITE_USE_EMULATOR": "true"'))
    throw new Error(`${BASE_URL} is not the e2e build (demo-kira on the emulators). Is another dev server on that port?`)

  for (const url of [
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`,
  ]) {
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Could not clear the emulator at ${url}: ${res.status}`)
  }
}
