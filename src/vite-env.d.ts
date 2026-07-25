/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AXIOM_ORGANIZATION_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
