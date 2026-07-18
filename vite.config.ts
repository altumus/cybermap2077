import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const overpassProxy = {
  '/api/overpass': {
    target: 'https://overpass.openstreetmap.fr',
    changeOrigin: true,
    rewrite: () => '/api/interpreter',
  },
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: overpassProxy },
  preview: { proxy: overpassProxy },
})
