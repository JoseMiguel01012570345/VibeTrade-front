/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Si es "true", en dev se usa `VITE_API_BASE_URL` aunque la ruta sea `/api/*` (no proxy de Vite). */
  readonly VITE_FORCE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
