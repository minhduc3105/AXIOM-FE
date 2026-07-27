/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/intelligence-service': {
        target: 'http://localhost:8007',
        changeOrigin: true,
      },
      '/document-api': {
        target: 'http://localhost:38001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/document-api/, ''),
      },
      '/corpus-api': {
        target: 'http://localhost:38002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/corpus-api/, ''),
      },
      '/methods-hub': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/methods-hub/, ''),
      },
      '/storage': {
        target: 'http://localhost:30443',
        changeOrigin: false,
        headers: {
          host: 'minio:9000',
        },
        rewrite: (path) => path.replace(/^\/storage/, ''),
      },
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
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    environment: 'jsdom',
    css: true,
  },
})
