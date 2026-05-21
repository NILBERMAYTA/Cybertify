const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const PKCE_VERIFIER_STORAGE_KEY = 'verifier'
const LEGACY_PKCE_VERIFIER_STORAGE_KEY = 'cybertify.spotify.pkce_verifier'
const ACCESS_TOKEN_STORAGE_KEY = 'cybertify.spotify.access_token'
const REFRESH_TOKEN_STORAGE_KEY = 'cybertify.spotify.refresh_token'
const TOKEN_EXPIRES_AT_STORAGE_KEY = 'cybertify.spotify.expires_at'

export const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-modify-playback-state',
] as const

export type SpotifyAuthConfig = {
  clientId: string
  redirectUri: string
  scopes?: readonly string[]
  codeChallenge?: string
  state?: string
}

export type SpotifyTokenResponse = {
  access_token: string
  token_type: 'Bearer'
  scope: string
  expires_in: number
  refresh_token?: string
}

export type StoredSpotifySession = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
}

function base64UrlEncode(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function randomString(length: number) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))

  return Array.from(values, (value) => possible[value % possible.length]).join('')
}

export function generateCodeVerifier() {
  return randomString(64)
}

export async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return base64UrlEncode(digest)
}

export function saveCodeVerifier(codeVerifier: string) {
  localStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier)
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier)
}

export function getSavedCodeVerifier() {
  return (
    localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY) ??
    sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY) ??
    sessionStorage.getItem(LEGACY_PKCE_VERIFIER_STORAGE_KEY)
  )
}

export function clearSavedCodeVerifier() {
  localStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
  sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
  sessionStorage.removeItem(LEGACY_PKCE_VERIFIER_STORAGE_KEY)
}

export function saveAccessToken(accessToken: string) {
  sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
}

export function getSavedAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export function clearSavedAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
}

export function saveRefreshToken(refreshToken: string) {
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
}

export function getSavedRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

export function clearSavedRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}

export function saveTokenExpiration(expiresInSeconds: number) {
  const expiresAt = Date.now() + expiresInSeconds * 1000
  sessionStorage.setItem(TOKEN_EXPIRES_AT_STORAGE_KEY, String(expiresAt))
}

export function getSavedTokenExpiration() {
  const expiresAt = sessionStorage.getItem(TOKEN_EXPIRES_AT_STORAGE_KEY)

  return expiresAt ? Number(expiresAt) : null
}

export function clearSavedTokenExpiration() {
  sessionStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE_KEY)
}

export function getStoredSpotifySession(): StoredSpotifySession {
  return {
    accessToken: getSavedAccessToken() ?? '',
    refreshToken: getSavedRefreshToken(),
    expiresAt: getSavedTokenExpiration(),
  }
}

export async function getValidAccessToken(config: SpotifyAuthConfig) {
  const session = getStoredSpotifySession()

  if (session.accessToken && (!session.expiresAt || session.expiresAt > Date.now() + 30_000)) {
    return session.accessToken
  }

  if (session.refreshToken) {
    return refreshAccessToken(config)
  }

  return null
}

function saveTokenResponse(tokenResponse: SpotifyTokenResponse) {
  saveAccessToken(tokenResponse.access_token)
  saveTokenExpiration(tokenResponse.expires_in)

  if (tokenResponse.refresh_token) {
    saveRefreshToken(tokenResponse.refresh_token)
  }

  return getStoredSpotifySession()
}

async function requestToken(params: URLSearchParams) {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string; error_description?: string } | null
    const description = errorBody?.error_description ?? errorBody?.error ?? `HTTP ${response.status}`

    throw new Error(`Spotify token request failed: ${description}`)
  }

  return response.json() as Promise<SpotifyTokenResponse>
}

export function buildSpotifyAuthUrl({ clientId, redirectUri, scopes, codeChallenge, state }: SpotifyAuthConfig) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: (scopes ?? SPOTIFY_SCOPES).join(' '),
  })

  if (codeChallenge) {
    params.set('code_challenge_method', 'S256')
    params.set('code_challenge', codeChallenge)
  }

  if (state) {
    params.set('state', state)
  }

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`
}

export async function createSpotifyLoginUrl(config: SpotifyAuthConfig) {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  saveCodeVerifier(codeVerifier)

  return buildSpotifyAuthUrl({
    ...config,
    codeChallenge,
    state: crypto.randomUUID(),
  })
}

export async function redirectToSpotifyLogin(config: SpotifyAuthConfig) {
  window.location.href = await createSpotifyLoginUrl(config)
}

export async function getAccessTokenFromCode({ clientId, redirectUri }: SpotifyAuthConfig, code: string) {
  const verifier = getSavedCodeVerifier()

  if (!verifier) {
    throw new Error('Missing PKCE verifier. Start the Spotify login flow again.')
  }

  const params = new URLSearchParams()
  params.append('client_id', clientId)
  params.append('grant_type', 'authorization_code')
  params.append('code', code)
  params.append('redirect_uri', redirectUri)
  params.append('code_verifier', verifier)

  const tokenResponse = await requestToken(params)
  const session = saveTokenResponse(tokenResponse)
  clearSavedCodeVerifier()

  return session
}

export async function refreshAccessToken({ clientId }: SpotifyAuthConfig) {
  const refreshToken = getSavedRefreshToken()

  if (!refreshToken) {
    throw new Error('Missing Spotify refresh token. Login again.')
  }

  const params = new URLSearchParams()
  params.append('client_id', clientId)
  params.append('grant_type', 'refresh_token')
  params.append('refresh_token', refreshToken)

  const tokenResponse = await requestToken(params)
  const session = saveTokenResponse(tokenResponse)

  return session.accessToken
}

export function logout() {
  clearSavedAccessToken()
  clearSavedRefreshToken()
  clearSavedTokenExpiration()
  clearSavedCodeVerifier()
}

export const getAccessToken = getAccessTokenFromCode
