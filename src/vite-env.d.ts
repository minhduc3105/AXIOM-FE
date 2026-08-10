/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AXIOM_ORGANIZATION_ID?: string
  readonly VITE_AXIOM_WORKSPACE_ID?: string
  readonly VITE_AXIOM_GATEWAY_API_URL?: string
  readonly VITE_ORGANIZATION_ID?: string
  readonly VITE_DOCUMENT_API_BASE_URL?: string
  readonly VITE_CORPUS_API_BASE_URL?: string
  readonly VITE_METHODS_HUB_API_BASE_URL?: string
  readonly VITE_METHODS_HUB_ADMIN_TOKEN?: string
  readonly VITE_MEMORY_API_BASE_URL?: string
  readonly VITE_REME_API_BASE_URL?: string
  readonly VITE_MEMORY_TENANT_ID?: string
  readonly VITE_MEMORY_WORKSPACE_ID?: string
  readonly VITE_MEMORY_USER_ID?: string
  readonly VITE_MEMORY_AGENT_ID?: string
  readonly VITE_MODEL_SERVICE_API_BASE_URL?: string
  readonly VITE_GEN_REPORT_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
