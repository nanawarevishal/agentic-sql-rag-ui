import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BACKEND_URL = 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Agentic SQL RAG',
        short_name: 'SQL RAG',
        start_url: '/',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
  server: {
    proxy: {
      '/query': BACKEND_URL,
      '/health': BACKEND_URL,
      '/info': BACKEND_URL,
      '/schema': BACKEND_URL,
      '/auth': BACKEND_URL,
      '/conversations': BACKEND_URL,
    },
  },
})
