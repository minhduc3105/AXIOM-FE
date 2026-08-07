/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const gatewayApiTarget =
  process.env.VITE_GATEWAY_API_PROXY_TARGET ?? "http://localhost:8007";
const methodsHubTarget =
  process.env.VITE_METHODS_HUB_PROXY_TARGET ?? "http://localhost:8000";
const modelServiceTarget =
  process.env.VITE_MODEL_SERVICE_PROXY_TARGET ?? "http://localhost:38006";
const storageTarget =
  process.env.VITE_STORAGE_PROXY_TARGET ?? "http://localhost:30443";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['axiom.iselab.site'],
    proxy: {
      "/auth-service": {
        target: gatewayApiTarget,
        changeOrigin: true,
      },
      "/intelligence-service": {
        target: gatewayApiTarget,
        changeOrigin: true,
      },
      "/document-api": {
        target: gatewayApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/document-api/, "/document-service"),
      },
      "/corpus-api": {
        target: gatewayApiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/corpus-api/, "/corpus-service"),
      },
      "/methods-hub": {
        target: methodsHubTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/methods-hub/, ""),
      },
      "/model-service": {
        target: modelServiceTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/model-service/, ""),
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
        target: gatewayApiTarget,
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/document/, "/document-service/api/v1"),
      },
      "/api/corpus": {
        target: gatewayApiTarget,
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/corpus/, "/corpus-service/api/v1"),
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
