/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AXIOM_ORGANIZATION_ID?: string
  readonly VITE_AXIOM_GATEWAY_API_URL?: string
  readonly VITE_ORGANIZATION_ID?: string
  readonly VITE_DOCUMENT_API_BASE_URL?: string
  readonly VITE_CORPUS_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
