import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  esbuild: {
    drop: process.env.NODE_ENV === 'development' ? [] : ['console', 'debugger'],
    legalComments: 'none'
  },
  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: 'oxc',
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
