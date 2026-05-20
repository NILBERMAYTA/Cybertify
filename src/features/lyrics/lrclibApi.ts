const LRCLIB_API_URL = 'https://lrclib.net/api'

export type LrcLibLyrics = {
  id: number
  name: string
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

export type LrcLibLyricsQuery = {
  albumName?: string
  artistName: string
  durationMs?: number
  trackName: string
}

export async function getLyricsFromLrcLib({ albumName, artistName, durationMs, trackName }: LrcLibLyricsQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({
    artist_name: artistName,
    track_name: trackName,
  })

  if (albumName) {
    params.set('album_name', albumName)
  }

  if (durationMs) {
    params.set('duration', String(Math.round(durationMs / 1000)))
  }

  const response = await fetch(`${LRCLIB_API_URL}/get?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Lrclib-Client': 'Cybertify/0.0.0',
    },
    signal,
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`LRCLIB request failed: HTTP ${response.status}`)
  }

  return response.json() as Promise<LrcLibLyrics>
}
