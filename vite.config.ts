import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Changed from '/job-tracker/' for Firebase Hosting root deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})


