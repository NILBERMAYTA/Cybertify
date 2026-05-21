import { memo, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { spotifyConfig } from '../../app/config'
import { paths } from '../../app/paths'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'
import { searchTracks, SpotifyApiError } from '../../features/spotify/spotifyApi'
import type { SpotifyTrack } from '../../features/spotify/spotifyTypes'

function TrackSearchPanelComponent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [status, setStatus] = useState('Search Spotify tracks')
  const deviceId = usePlayerStore((state) => state.deviceId)
  const setPendingTrackUri = usePlayerStore((state) => state.setPendingTrackUri)
  const webPlaybackStatus = usePlayerStore((state) => state.webPlaybackStatus)
  const navigate = useNavigate()

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof SpotifyApiError && [502, 503, 504].includes(error.status)) {
      return 'Spotify gateway temporal. Reintenta en unos segundos.'
    }

    if (error instanceof Error && error.message.includes('Bad gateway')) {
      return 'Spotify gateway temporal. Reintenta en unos segundos.'
    }

    return error instanceof Error ? error.message : 'Spotify request failed'
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setStatus('Search Spotify tracks')
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      const accessToken = await getValidAccessToken(spotifyConfig)

      if (!accessToken) {
        setStatus('Login required')
        return
      }

      try {
        const response = await searchTracks(accessToken, query, 8, controller.signal)
        setResults(response.tracks.items)
        setStatus(`${response.tracks.items.length} results`)
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus(getErrorMessage(error))
        }
      }
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [getErrorMessage, query])

  const handlePlayTrack = useCallback(async (track: SpotifyTrack) => {
    const accessToken = await getValidAccessToken(spotifyConfig)

    if (!accessToken) {
      setStatus('Login required')
      return
    }

    setPendingTrackUri(track.uri)
    setStatus(deviceId ? `Opening player for ${track.name}` : `Opening player. ${webPlaybackStatus}`)
    navigate(paths.player)
  }, [deviceId, navigate, setPendingTrackUri, webPlaybackStatus])

  return (
    <div className="space-y-4">
      <label className="block text-xs uppercase text-[#999]" htmlFor="track-search">
        Song search
      </label>
      <input
        className="w-full border border-[#444] bg-[#222] px-3 py-3 text-sm text-[#ddd] outline-none focus:border-[#888]"
        id="track-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search track, artist, album..."
        type="search"
        value={query}
      />
      <p className="text-xs text-[#999]">{status}</p>
      <p className="text-xs text-[#666]">Device: {deviceId ? 'Cybertify ready' : webPlaybackStatus}</p>
      <div className="grid gap-2">
        {results.map((track) => (
          <button
            className="grid grid-cols-[48px_1fr_auto] items-center gap-3 border border-[#333] bg-[#1a1a1a] p-2 text-left hover:border-[#666]"
            key={track.id}
            onClick={() => void handlePlayTrack(track)}
            type="button"
          >
            <img className="h-12 w-12 object-cover" src={track.album.images[0]?.url} alt="" />
            <span className="min-w-0">
              <span className="block truncate text-sm text-white">{track.name}</span>
              <span className="block truncate text-xs text-[#999]">{track.artists.map((artist) => artist.name).join(', ')}</span>
            </span>
            <span className="text-xs uppercase text-[#999]">Play</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export const TrackSearchPanel = memo(TrackSearchPanelComponent)
