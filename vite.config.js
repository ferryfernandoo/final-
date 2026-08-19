import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    emptyOutDir: true,
    sourcemap: false, // Keep source code private and protected from crawlers
    rollupOptions: {
      input: './index.html'
    }
  },
  server: {
    host: true,
    middlewareMode: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, '/auth'),
      }
    }
  }
})
