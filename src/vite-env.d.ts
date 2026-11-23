/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  /** 'true' only in e2e runs: use the local Firebase emulators. */
  readonly VITE_USE_EMULATOR?: string
  /** 'dev' only in the dev APK (see dev-apk.yml): no update check, labelled "kira dev". */
  readonly VITE_APP_ENV?: string
}
