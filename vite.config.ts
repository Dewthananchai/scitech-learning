import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the site under /scitech-learning/ — the deploy workflow
// sets VITE_PAGES_BASE=1 so the production build gets that base path.
// Local dev and local builds keep the plain '/' base.
const isPagesBuild = process.env.VITE_PAGES_BASE === '1'

export default defineConfig({
  base: isPagesBuild ? '/scitech-learning/' : '/',
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces (LAN accessible)
    proxy: {
      // Shared worksheet database on the API server
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
