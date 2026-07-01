import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'SuperBET',
        short_name: 'SuperBET',
        description: 'Die ultimative Fussball-Tipprunde',
        theme_color: '#0f172a', // Tailwind slate-900
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'custom-sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,otf,ttf,woff,woff2}']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5174,
  },
})
