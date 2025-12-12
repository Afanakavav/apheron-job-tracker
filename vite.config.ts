import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Apheron Job Tracker',
        short_name: 'Job Tracker',
        description: 'Gestione avanzata delle candidature di lavoro',
        theme_color: '#1976d2',
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
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 giorno
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            },
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 giorni
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 giorni
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/', // Changed from '/job-tracker/' for Firebase Hosting root deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Material-UI libraries (large)
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          
          // Firebase libraries (large)
          'firebase-vendor': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/functions',
          ],
          
          // AI libraries (Gemini - large)
          'ai-vendor': ['@google/generative-ai'],
          
          // Charts libraries
          'charts-vendor': ['recharts'],
          
          // DnD library
          'dnd-vendor': ['@hello-pangea/dnd'],
          
          // Form libraries
          'form-vendor': ['react-hook-form'],
          
          // Analytics
          'analytics-vendor': ['react-ga4'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit to 600kb (we're splitting now)
  },
})


