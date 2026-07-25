/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api/document': {
        target: 'http://localhost:38001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/document/, '/api/v1'),
      },
      '/api/corpus': {
        target: 'http://localhost:38002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/corpus/, '/api/v1'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
