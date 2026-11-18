import { StrictMode } from 'react'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// The native app bundles its assets; a service worker there only causes stale caches.
if (!Capacitor.isNativePlatform()) registerSW({ immediate: true })
