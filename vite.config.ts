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
      '/auth': BACKEND_URL,
      '/conversations': BACKEND_URL,
      // /projects and /admin are BOTH client-side routes and API paths, so a
      // plain proxy entry sends the browser the API's JSON instead of the app
      // when you navigate to or reload that page. Bypassing document requests
      // keeps both: a navigation (Accept: text/html) falls through to the SPA,
      // while fetch/XHR (Accept: application/json) still proxies to the API.
      '/projects': { target: BACKEND_URL, bypass: serveAppForNavigations },
      '/admin': { target: BACKEND_URL, bypass: serveAppForNavigations },
      // Pre-rename path, still served by the backend as a deprecated alias.
      // No collision: the client-side route is /projects, not /datasources.
      '/datasources': BACKEND_URL,
    },
  },
})

// Returning a path serves that file instead of proxying; returning undefined
// proxies as normal.
function serveAppForNavigations(req: { headers: Record<string, string | string[] | undefined> }) {
  const accept = String(req.headers.accept ?? '')
  return accept.includes('text/html') ? '/index.html' : undefined
}
