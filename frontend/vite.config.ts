import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev: proxy /api sang backend Spring Boot de khong vuong CORS.
// Prod: dat VITE_API_URL tro toi domain backend (xem docs/deployment.md).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
