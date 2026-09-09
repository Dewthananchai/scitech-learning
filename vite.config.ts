import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces (LAN accessible)
    proxy: {
      // Shared worksheet database on the API server
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
