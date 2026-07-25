/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
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
      '/storage': {
        target: 'http://localhost:30443',
        changeOrigin: false,
        headers: {
          host: 'minio:9000',
        },
        rewrite: (path) => path.replace(/^\/storage/, ''),
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
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
