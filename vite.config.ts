/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const gatewayApiTarget =
  process.env.VITE_GATEWAY_API_PROXY_TARGET ?? "http://localhost:8007";
const intelligenceApiTarget =
  process.env.VITE_INTELLIGENCE_API_PROXY_TARGET ?? "http://localhost:8006";
const documentApiTarget =
  process.env.VITE_DOCUMENT_API_PROXY_TARGET ?? "http://localhost:38001";
const corpusApiTarget =
  process.env.VITE_CORPUS_API_PROXY_TARGET ?? "http://localhost:38002";
const methodsHubTarget =
  process.env.VITE_METHODS_HUB_PROXY_TARGET ?? "http://localhost:8000";
const storageTarget =
  process.env.VITE_STORAGE_PROXY_TARGET ?? "http://localhost:30443";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['axiom.iselab.site'],
    proxy: {
      "/intelligence-service": {
        target: intelligenceApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.slice("/intelligence-service".length),
      },
      "/document-api": {
        target: documentApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/document-api/, ""),
      },
      "/corpus-api": {
        target: corpusApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/corpus-api/, ""),
      },
      "/methods-hub": {
        target: methodsHubTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/methods-hub/, ""),
      },
      "/storage": {
        target: storageTarget,
        changeOrigin: false,
        headers: {
          host: "minio:9000",
        },
        rewrite: (path) => path.replace(/^\/storage/, ""),
      },
      "/api/document": {
        target: documentApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/document/, "/api/v1"),
      },
      "/api/corpus": {
        target: corpusApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/corpus/, "/api/v1"),
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    environment: "jsdom",
    css: true,
  },
});
