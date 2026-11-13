import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Let Vite 8 / Rolldown manage dependency chunking.
// Custom output.manualChunks is deprecated in Vite 8 and was isolating
// Axios into a separate network-vendor chunk that crashes at runtime.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
})
