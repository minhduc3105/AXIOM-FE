/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const gatewayApiTarget =
    environment.VITE_GATEWAY_API_PROXY_TARGET ?? "http://localhost:8007";
  const dataIntelligenceApiTarget =
    environment.VITE_DATA_INTELLIGENCE_API_PROXY_TARGET ??
    "http://localhost:8036";
  const methodsHubTarget =
    environment.METHODS_HUB_PROXY_TARGET ?? "http://localhost:38000";
  const methodsHubAdminToken = environment.METHOD_HUB_ADMIN_TOKEN;
  const skillRegistryTarget =
    environment.VITE_SKILL_REGISTRY_PROXY_TARGET ?? gatewayApiTarget;
  const modelServiceTarget =
    environment.VITE_MODEL_SERVICE_PROXY_TARGET ?? gatewayApiTarget;
  const storageTarget =
    environment.VITE_STORAGE_PROXY_TARGET ?? "http://localhost:30443";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      allowedHosts: [
        "axiom.iselab.site",
        "tuananh5173.iselab.site",
        "honganh5173.iselab.site",
        "minhduc5173.iselab.site",
      ],
      proxy: {
        "/data-intelligence-api": {
          target: dataIntelligenceApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/data-intelligence-api/, ""),
        },
        "/auth-service": {
          target: gatewayApiTarget,
          changeOrigin: true,
        },
        "/authz-service": {
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
          rewrite: (path) =>
            path.replace(/^\/document-api/, "/document-service"),
        },
        "/corpus-api": {
          target: gatewayApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/corpus-api/, "/corpus-service"),
        },
        "/methods-hub": {
          target: methodsHubTarget,
          changeOrigin: true,
          ...(methodsHubAdminToken
            ? { headers: { Authorization: `Bearer ${methodsHubAdminToken}` } }
            : {}),
          rewrite: (path) => path.replace(/^\/methods-hub/, ""),
        },
        "/skill-registry": {
          target: skillRegistryTarget,
          changeOrigin: true,
        },
        "/model-service": {
          target: modelServiceTarget,
          changeOrigin: true,
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
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
