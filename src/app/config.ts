import { SPOTIFY_SCOPES } from '../features/auth/spotifyAuth'

function getRedirectUri() {
  const envRedirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI
  const runtimeRedirectUri = `${window.location.origin}/callback`

  if (
    !envRedirectUri ||
    envRedirectUri.includes('127.0.0.1') ||
    envRedirectUri.includes('localhost')
  ) {
    return runtimeRedirectUri
  }

  return envRedirectUri
}

export const spotifyConfig = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  redirectUri: getRedirectUri(),
  scopes: SPOTIFY_SCOPES,
}

export function isSpotifyConfigured() {
  return Boolean(spotifyConfig.clientId && spotifyConfig.clientId !== 'TU_CLIENT_ID')
}
