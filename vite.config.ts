import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pkg: { version: string } = JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8'))

export default defineConfig({
  // The app's version comes from package.json, the same source CI releases from.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered by hand in main.tsx so the native app can skip it.
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Kira',
        short_name: 'Kira',
        description: 'Personal expense tracker',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Latin font subsets only; other subsets load on demand if ever needed.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}', '**/*latin*.woff2'],
        // Firebase reserves /__/ (auth handler); never serve the SPA shell for it.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
})
