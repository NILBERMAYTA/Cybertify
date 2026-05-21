/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string
  readonly VITE_SPOTIFY_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

type SpotifyWebPlaybackError = {
  message: string
}

type SpotifyWebPlaybackReadyEvent = {
  device_id: string
}

type SpotifyWebPlaybackPlayer = {
  addListener: (event: string, callback: (event: SpotifyWebPlaybackError | SpotifyWebPlaybackReadyEvent) => void) => void
  connect: () => Promise<boolean>
  disconnect: () => void
}

interface Window {
  __CYBERTIFY_ENV__?: {
    VITE_SPOTIFY_CLIENT_ID?: string
    VITE_SPOTIFY_REDIRECT_URI?: string
  }
  onSpotifyWebPlaybackSDKReady?: () => void
  Spotify?: {
    Player: new (options: {
      getOAuthToken: (callback: (token: string) => void) => void
      name: string
      volume?: number
    }) => SpotifyWebPlaybackPlayer
  }
}
