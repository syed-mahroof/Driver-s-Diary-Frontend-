import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // Inlines the preloader art into index.html so it is part of the first paint. Keep above its file sizes.
    assetsInlineLimit: 10240,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Driver's Diary",
        short_name: "Driver's Diary",
        description: "Driver's Diary by HeadGreen!",
        // Must match the preloader background in index.html so launch and preloader look continuous.
        theme_color: '#0f1117',
        background_color: '#0f1117',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'logo-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        start_url: '/',
        scope: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // PDF export needs the server anyway, so its ~800 KB of libraries load on demand instead of at install.
        globIgnores: ['**/jspdf*', '**/html2canvas*', '**/purify*', '**/index.es-*'],
        runtimeCaching: [
          {
            // Fresh whenever online (a newly added company must appear at once); cached so the
            // Add Ride form still works when the app is opened offline.
            urlPattern: /^https?:\/\/.*\/api\/(companies|vehicles)\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-lookups',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
