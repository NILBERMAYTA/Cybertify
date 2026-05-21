import type {
  SpotifyPlaybackState,
  SpotifySearchTracksResponse,
  SpotifyUserProfile,
} from './spotifyTypes'

const SPOTIFY_API_URL = 'https://api.spotify.com/v1'
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504])

type SpotifyRequestOptions = {
  body?: unknown
  method?: 'GET' | 'POST' | 'PUT'
  signal?: AbortSignal
}

export class SpotifyApiError extends Error {
  status: number
  retryAfterSeconds: number | null

  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message)
    this.name = 'SpotifyApiError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getRetryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get('Retry-After')
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : null

  if (retryAfterSeconds && Number.isFinite(retryAfterSeconds)) {
    return retryAfterSeconds * 1000
  }

  return response.status === 429 ? 2000 * 2 ** attempt : 350 * 2 ** attempt
}

async function spotifyFetch<T>(path: string, accessToken: string, options: SpotifyRequestOptions = {}): Promise<T> {
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  })

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const requestInit: RequestInit = {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers,
    method: options.method ?? 'GET',
    signal: options.signal,
  }

  let response = await fetch(`${SPOTIFY_API_URL}${path}`, requestInit)

  for (let attempt = 0; attempt < 2 && RETRYABLE_STATUS_CODES.has(response.status) && !options.signal?.aborted; attempt += 1) {
    await wait(getRetryDelay(response, attempt))
    response = await fetch(`${SPOTIFY_API_URL}${path}`, requestInit)
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string }; message?: string } | null
    const retryAfter = response.headers.get('Retry-After')
    const retryAfterSeconds = retryAfter ? Number(retryAfter) : null
    const message =
      response.status === 429
        ? `Rate limit reached${retryAfterSeconds && Number.isFinite(retryAfterSeconds) ? `. Retry after ${retryAfterSeconds}s` : ''}`
        : errorBody?.error?.message ?? errorBody?.message ?? `HTTP ${response.status}`

    throw new SpotifyApiError(
      `Spotify API request failed: ${message}`,
      response.status,
      retryAfterSeconds && Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function getCurrentUser(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyUserProfile>('/me', accessToken, { signal })
}

export function getPlaybackState(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyPlaybackState | null>('/me/player', accessToken, { signal })
}

export function searchTracks(accessToken: string, query: string, limit = 8, signal?: AbortSignal) {
  const safeLimit = Math.min(10, Math.max(1, Math.round(limit)))
  const params = new URLSearchParams({
    include_external: 'audio',
    limit: String(safeLimit),
    market: 'US',
    offset: '0',
    q: query,
    type: 'track',
  })

  return spotifyFetch<SpotifySearchTracksResponse>(`/search?${params.toString()}`, accessToken, { signal })
}

export function play(accessToken: string, options: { uris?: string[]; signal?: AbortSignal } = {}) {
  const body = options.uris ? { uris: options.uris } : undefined

  return spotifyFetch<void>('/me/player/play', accessToken, {
    body,
    method: 'PUT',
    signal: options.signal,
  })
}

export const fetchProfile = getCurrentUser
export const getCurrentPlayback = getPlaybackState

