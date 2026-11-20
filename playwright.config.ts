import { defineConfig, devices } from '@playwright/test'

// An odd port on IPv4 only, never reused: an already-running dev server would be on the live project, and
// "localhost" can reach a different server listening on the same port over IPv6.
const PORT = 5199
export const BASE_URL = `http://127.0.0.1:${PORT}`

// Everything runs against the local Firebase emulators under a demo- project, so a test can never touch live data.
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: [
    {
      command: 'npx firebase emulators:start --only auth,firestore --project demo-kira',
      url: 'http://127.0.0.1:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: false,
      // Real env vars beat .env files in Vite, so a developer's .env with the live project is ignored here.
      env: {
        VITE_FIREBASE_API_KEY: 'demo-key',
        VITE_FIREBASE_PROJECT_ID: 'demo-kira',
        VITE_FIREBASE_SENDER_ID: '0',
        VITE_FIREBASE_APP_ID: 'demo-app',
        VITE_USE_EMULATOR: 'true',
      },
    },
  ],
})
