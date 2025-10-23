import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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


