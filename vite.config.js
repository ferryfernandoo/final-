import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    emptyOutDir: true,
    sourcemap: false, // Strict protection: Zero source maps generated
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Strips all console.log statements and debug messages
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2,
      },
      mangle: {
        toplevel: true, // Heavily obfuscates top-level variable and function names
      },
      format: {
        comments: false, // Completely eliminates all comments, credits, licenses from output
      },
    },
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
