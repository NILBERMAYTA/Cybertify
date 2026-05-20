import { SPOTIFY_SCOPES } from '../features/auth/spotifyAuth'

export const spotifyConfig = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
  scopes: SPOTIFY_SCOPES,
}

export function isSpotifyConfigured() {
  return Boolean(spotifyConfig.clientId && spotifyConfig.clientId !== 'TU_CLIENT_ID')
}
