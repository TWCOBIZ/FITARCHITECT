import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    },
    // Enable HTTPS in development when HTTPS=true environment variable is set
    https: process.env.HTTPS === 'true' ? {} : false
  },
  build: {
    // Ensure proper build output for deployment
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production'
  }
}) 