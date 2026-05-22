/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string
  readonly VITE_SPOTIFY_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __CYBERTIFY_ENV__?: {
    VITE_SPOTIFY_CLIENT_ID?: string
    VITE_SPOTIFY_REDIRECT_URI?: string
  }
}
