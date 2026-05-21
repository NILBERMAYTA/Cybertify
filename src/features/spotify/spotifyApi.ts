import type {
  SpotifyCurrentlyPlaying,
  SpotifyDevicesResponse,
  SpotifyPlaybackState,
  SpotifyQueue,
  SpotifyRecommendationsResponse,
  SpotifySearchTracksResponse,
  SpotifyUserProfile,
} from './spotifyTypes'

const SPOTIFY_API_URL = 'https://api.spotify.com/v1'
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504])

type SpotifyRequestOptions = {
  body?: unknown
  method?: 'GET' | 'POST' | 'PUT'
  signal?: AbortSignal
}

type DeviceRequestOptions = {
  deviceId?: string
  signal?: AbortSignal
}

type PlayOptions = DeviceRequestOptions & {
  contextUri?: string
  uris?: string[]
  offset?: { position?: number; uri?: string }
  positionMs?: number
}

export class SpotifyApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SpotifyApiError'
    this.status = status
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getRetryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get('Retry-After')

  if (retryAfter) {
    return Number(retryAfter) * 1000
  }

  return 350 * 2 ** attempt
}

function withDeviceId(path: string, deviceId?: string) {
  if (!deviceId) {
    return path
  }

  const separator = path.includes('?') ? '&' : '?'

  return `${path}${separator}device_id=${encodeURIComponent(deviceId)}`
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
    const message = errorBody?.error?.message ?? errorBody?.message ?? `HTTP ${response.status}`

    throw new SpotifyApiError(`Spotify API request failed: ${message}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function getCurrentUser(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyUserProfile>('/me', accessToken, { signal })
}

export function getCurrentlyPlaying(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyCurrentlyPlaying | null>('/me/player/currently-playing', accessToken, { signal })
}

export function getPlaybackState(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyPlaybackState | null>('/me/player', accessToken, { signal })
}

export function getAvailableDevices(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyDevicesResponse>('/me/player/devices', accessToken, { signal })
}

export function transferPlayback(accessToken: string, deviceId: string, playAfterTransfer = false, signal?: AbortSignal) {
  return spotifyFetch<void>('/me/player', accessToken, {
    body: {
      device_ids: [deviceId],
      play: playAfterTransfer,
    },
    method: 'PUT',
    signal,
  })
}

export function searchTracks(accessToken: string, query: string, limit = 8, signal?: AbortSignal) {
  const safeLimit = Math.min(50, Math.max(1, Math.round(limit)))
  const params = new URLSearchParams({
    limit: String(safeLimit),
    q: query,
    type: 'track',
  })

  return spotifyFetch<SpotifySearchTracksResponse>(`/search?${params.toString()}`, accessToken, { signal })
}

export function getQueue(accessToken: string, signal?: AbortSignal) {
  return spotifyFetch<SpotifyQueue>('/me/player/queue', accessToken, { signal })
}

export function getRecommendations(
  accessToken: string,
  options: {
    limit?: number
    seedArtistIds?: string[]
    seedTrackIds?: string[]
    signal?: AbortSignal
  },
) {
  const safeLimit = Math.min(20, Math.max(1, Math.round(options.limit ?? 10)))
  const params = new URLSearchParams({
    limit: String(safeLimit),
  })

  if (options.seedArtistIds?.length) {
    params.set('seed_artists', options.seedArtistIds.slice(0, 5).join(','))
  }

  if (options.seedTrackIds?.length) {
    params.set('seed_tracks', options.seedTrackIds.slice(0, 5).join(','))
  }

  return spotifyFetch<SpotifyRecommendationsResponse>(`/recommendations?${params.toString()}`, accessToken, {
    signal: options.signal,
  })
}

export function addToQueue(accessToken: string, uri: string, options: DeviceRequestOptions = {}) {
  const path = withDeviceId(`/me/player/queue?uri=${encodeURIComponent(uri)}`, options.deviceId)

  return spotifyFetch<void>(path, accessToken, {
    method: 'POST',
    signal: options.signal,
  })
}

export function play(accessToken: string, options: PlayOptions = {}) {
  const body =
    options.contextUri || options.uris || options.offset || options.positionMs !== undefined
      ? {
          context_uri: options.contextUri,
          uris: options.uris,
          offset: options.offset,
          position_ms: options.positionMs,
        }
      : undefined

  return spotifyFetch<void>(withDeviceId('/me/player/play', options.deviceId), accessToken, {
    body,
    method: 'PUT',
    signal: options.signal,
  })
}

export function pause(accessToken: string, options: DeviceRequestOptions = {}) {
  return spotifyFetch<void>(withDeviceId('/me/player/pause', options.deviceId), accessToken, {
    method: 'PUT',
    signal: options.signal,
  })
}

export function nextTrack(accessToken: string, options: DeviceRequestOptions = {}) {
  return spotifyFetch<void>(withDeviceId('/me/player/next', options.deviceId), accessToken, {
    method: 'POST',
    signal: options.signal,
  })
}

export function previousTrack(accessToken: string, options: DeviceRequestOptions = {}) {
  return spotifyFetch<void>(withDeviceId('/me/player/previous', options.deviceId), accessToken, {
    method: 'POST',
    signal: options.signal,
  })
}

export function seekToPosition(accessToken: string, positionMs: number, options: DeviceRequestOptions = {}) {
  const path = withDeviceId(`/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}`, options.deviceId)

  return spotifyFetch<void>(path, accessToken, {
    method: 'PUT',
    signal: options.signal,
  })
}

export function setVolume(accessToken: string, volumePercent: number, options: DeviceRequestOptions = {}) {
  const volume = Math.min(100, Math.max(0, Math.round(volumePercent)))
  const path = withDeviceId(`/me/player/volume?volume_percent=${volume}`, options.deviceId)

  return spotifyFetch<void>(path, accessToken, {
    method: 'PUT',
    signal: options.signal,
  })
}

export const fetchProfile = getCurrentUser
export const getCurrentPlayback = getPlaybackState
