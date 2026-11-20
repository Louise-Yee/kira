import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import { Capacitor } from '@capacitor/core'
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'

export type AppUser = Pick<User, 'displayName' | 'photoURL' | 'email' | 'uid'>

// Config comes from .env (see .env.example). Vite inlines it into the bundle at build time.
const env = import.meta.env
const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_SENDER_ID', 'VITE_FIREBASE_APP_ID'] as const
for (const k of required) if (!env[k]) throw new Error(`Missing ${k}: copy .env.example to .env and fill it in`)
const PROJECT = env.VITE_FIREBASE_PROJECT_ID
const host = location.hostname
// Serving auth from the same origin as the app keeps redirect sign-in working in iOS
// standalone PWAs (third-party storage is blocked there). Firebase Hosting serves
// /__/auth/* on both of its domains; on localhost we fall back to the default domain.
const onFirebaseHosting = host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: onFirebaseHosting ? host : `${PROJECT}.firebaseapp.com`,
  projectId: PROJECT,
  storageBucket: `${PROJECT}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

// E2E only (npm run e2e sets it): talk to the local emulators. A prod build never has the flag, so this is
// compiled out, and the demo- project id guarantees the emulators can't reach a real Firebase project.
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  if (!PROJECT.startsWith('demo-')) throw new Error('VITE_USE_EMULATOR needs a demo- project id')
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export async function signIn() {
  if (Capacitor.isNativePlatform()) {
    // Google blocks OAuth in WebViews: native sign-in returns an ID token, then the JS SDK signs in with it.
    const { credential } = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })
    if (!credential?.idToken) throw new Error('Google sign-in returned no ID token')
    return signInWithCredential(auth, GoogleAuthProvider.credential(credential.idToken))
  }
  const provider = new GoogleAuthProvider()
  // Popups break in installed PWAs; redirect needs a same-origin auth domain (see above).
  return onFirebaseHosting ? signInWithRedirect(auth, provider) : signInWithPopup(auth, provider)
}

export async function logOut() {
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut()
  return signOut(auth)
}

/** undefined = still resolving, null = signed out. */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(auth.currentUser ?? undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return user
}
