import type {
  SpotifyDevicesResponse,
  SpotifyPlaybackState,
  SpotifySearchTracksResponse,
  SpotifyUserProfile,
  SpotifyQueueResponse,
  SpotifyFeaturedPlaylistsResponse,
  SpotifyUserPlaylistsResponse,
  SpotifyCategoriesResponse,
  SpotifySearchPlaylistsResponse,
} from './spotifyTypes'

const SPOTIFY_API_URL = 'https://api.spotify.com/v1'
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504])

type SpotifyRequestOptions = {
  body?: unknown
  method?: 'DELETE' | 'GET' | 'POST' | 'PUT'
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

  const text = await response.text().catch(() => '')
  if (!text) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    // Some successful Spotify endpoints return non-JSON text (e.g. routing tokens or empty bodies)
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch (err) {
    throw new SpotifyApiError(
      `Invalid JSON response: ${text.slice(0, 100)}...`,
      response.status,
    )
  }
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

export function searchPlaylists(accessToken: string, query: string, limit = 8, signal?: AbortSignal) {
  const safeLimit = Math.min(50, Math.max(1, Math.round(limit)))
  const params = new URLSearchParams({
    limit: String(safeLimit),
    q: query,
    type: 'playlist',
  })

  return spotifyFetch<SpotifySearchPlaylistsResponse>(`/search?${params.toString()}`, accessToken, { signal })
}

export function play(accessToken: string, options: { uris?: string[]; context_uri?: string; offset?: { position?: number; uri?: string }; deviceId?: string; signal?: AbortSignal } = {}) {
  const body: any = {}
  
  if (options.context_uri) {
    body.context_uri = options.context_uri
    if (options.offset) {
      body.offset = options.offset
    }
  } else if (options.uris) {
    body.uris = options.uris
    if (options.offset) {
      body.offset = options.offset
    }
  }

  const query = options.deviceId ? `?device_id=${options.deviceId}` : ''

  return spotifyFetch<void>(`/me/player/play${query}`, accessToken, {
    body: Object.keys(body).length > 0 ? body : undefined,
    method: 'PUT',
    signal: options.signal,
  })
}

export function pause(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<void>('/me/player/pause', accessToken, {
    method: 'PUT',
    signal,
  })
}

export function skipToNext(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<void>('/me/player/next', accessToken, {
    method: 'POST',
    signal,
  })
}

export function skipToPrevious(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<void>('/me/player/previous', accessToken, {
    method: 'POST',
    signal,
  })
}

export function seekToPosition(accessToken: string, positionMs: number, signal?: AbortSignal) {
  return spotifyFetch<void>(`/me/player/seek?position_ms=${Math.round(positionMs)}`, accessToken, {
    method: 'PUT',
    signal,
  })
}

export function setVolume(accessToken: string, volumePercent: number, signal?: AbortSignal) {
  const safeVolume = Math.min(100, Math.max(0, Math.round(volumePercent)))

  return spotifyFetch<void>(`/me/player/volume?volume_percent=${safeVolume}`, accessToken, {
    method: 'PUT',
    signal,
  })
}

export function setShuffle(accessToken: string, state: boolean, signal?: AbortSignal) {
  return spotifyFetch<void>(`/me/player/shuffle?state=${state}`, accessToken, {
    method: 'PUT',
    signal,
  })
}

export function setRepeat(accessToken: string, state: 'off' | 'context' | 'track', signal?: AbortSignal) {
  return spotifyFetch<void>(`/me/player/repeat?state=${state}`, accessToken, {
    method: 'PUT',
    signal,
  })
}

export function getAvailableDevices(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyDevicesResponse>('/me/player/devices', accessToken, { signal })
}

export function transferPlayback(accessToken: string, deviceId: string, startPlaying = true, signal?: AbortSignal) {
  return spotifyFetch<void>('/me/player', accessToken, {
    body: { device_ids: [deviceId], play: startPlaying },
    method: 'PUT',
    signal,
  })
}

export function getQueue(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyQueueResponse>('/me/player/queue', accessToken, { signal })
}

export function getFeaturedPlaylists(accessToken: string, limit = 10, signal?: AbortSignal) {
  return spotifyFetch<SpotifyFeaturedPlaylistsResponse>(`/browse/featured-playlists?limit=${limit}`, accessToken, { signal })
}

export function getUserPlaylists(accessToken: string, limit = 10, signal?: AbortSignal) {
  return spotifyFetch<SpotifyUserPlaylistsResponse>(`/me/playlists?limit=${limit}`, accessToken, { signal })
}

export function getCategoryPlaylists(accessToken: string, categoryId: string, limit = 10, signal?: AbortSignal) {
  return spotifyFetch<SpotifyFeaturedPlaylistsResponse>(`/browse/categories/${categoryId}/playlists?limit=${limit}`, accessToken, { signal })
}

export function getCategories(accessToken: string, limit = 10, signal?: AbortSignal) {
  return spotifyFetch<SpotifyCategoriesResponse>(`/browse/categories?limit=${limit}`, accessToken, { signal })
}

export const fetchProfile = getCurrentUser
export const getCurrentPlayback = getPlaybackState
