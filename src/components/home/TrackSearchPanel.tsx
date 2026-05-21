import { memo, useCallback, useRef, useState } from 'react'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { play, searchTracks, SpotifyApiError } from '../../features/spotify/spotifyApi'
import type { SpotifyTrack } from '../../features/spotify/spotifyTypes'

type TrackSearchPanelProps = {
  onTrackPlayed?: () => void
}

function TrackSearchPanelComponent({ onTrackPlayed }: TrackSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [status, setStatus] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const cacheRef = useRef(new Map<string, SpotifyTrack[]>())
  const cooldownUntilRef = useRef(0)

  const runSearch = useCallback(async () => {
    const normalizedQuery = query.trim()
    const cacheKey = normalizedQuery.toLowerCase()

    if (normalizedQuery.length < 3) {
      setResults([])
      setStatus('Type 3+ chars')
      return
    }

    const cachedResults = cacheRef.current.get(cacheKey)

    if (cachedResults) {
      setResults(cachedResults)
      setIsOpen(true)
      setStatus(`${cachedResults.length} cached results`)
      return
    }

    const cooldownMs = cooldownUntilRef.current - Date.now()

    if (cooldownMs > 0) {
      setStatus(`Rate limit. Wait ${Math.ceil(cooldownMs / 1000)}s.`)
      return
    }

    const accessToken = await getValidAccessToken(spotifyConfig)

    if (!accessToken) {
      setStatus('Login required')
      return
    }

    setStatus('Searching...')

    try {
      const response = await searchTracks(accessToken, normalizedQuery, 6)
      cacheRef.current.set(cacheKey, response.tracks.items)
      setResults(response.tracks.items)
      setIsOpen(true)
      setStatus(response.tracks.items.length ? `${response.tracks.items.length} results` : 'No results')
    } catch (error) {
      if (error instanceof SpotifyApiError && error.status === 429) {
        cooldownUntilRef.current = Date.now() + (error.retryAfterSeconds ?? 15) * 1000
        setStatus(`Rate limit. Wait ${error.retryAfterSeconds ?? 15}s.`)
        return
      }

      if (error instanceof SpotifyApiError && error.status === 401) {
        setStatus('Session expired. Login again.')
        return
      }

      setStatus(error instanceof Error ? error.message : 'Search failed')
    }
  }, [query])

  const handlePlayTrack = useCallback(async (track: SpotifyTrack) => {
    const accessToken = await getValidAccessToken(spotifyConfig)

    if (!accessToken) {
      setStatus('Login required')
      return
    }

    setStatus(`Playing ${track.name}...`)
    setIsOpen(false)
    setQuery('')
    setResults([])

    try {
      await play(accessToken, { uris: [track.uri] })
      setStatus(`▶ ${track.name}`)
      onTrackPlayed?.()
    } catch (error) {
      if (error instanceof SpotifyApiError && error.status === 429) {
        cooldownUntilRef.current = Date.now() + (error.retryAfterSeconds ?? 15) * 1000
        setStatus(`Rate limit. Wait ${error.retryAfterSeconds ?? 15}s.`)
        return
      }

      setStatus(error instanceof Error ? error.message : 'Play failed')
    }
  }, [onTrackPlayed])

  return (
    <form
      className="relative flex min-w-0 flex-1 gap-2 sm:min-w-[320px]"
      onSubmit={(event) => {
        event.preventDefault()
        void runSearch()
      }}
    >
      <input
        className="w-full border border-[#444] bg-[#222] px-3 py-2 text-xs normal-case text-[#ddd] outline-none placeholder:text-[#666] focus:border-[#888]"
        aria-label="Search Spotify tracks"
        onChange={(event) => {
          setQuery(event.target.value)
          if (!event.target.value.trim()) {
            setIsOpen(false)
            setResults([])
            setStatus('')
          }
        }}
        placeholder="Search song..."
        type="search"
        value={query}
      />
      <button
        className="shrink-0 border border-[#444] bg-[#222] px-3 py-2 text-xs uppercase text-[#ddd] hover:border-[#777] focus:border-[#888] focus:outline-none"
        type="submit"
      >
        Search
      </button>
      {status ? (
        <p className="absolute left-0 top-full mt-1 text-[10px] normal-case text-[#777]">{status}</p>
      ) : null}
      {isOpen && results.length ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-6 grid max-h-72 gap-1 overflow-y-auto border border-[#333] bg-[#121212] p-2 shadow-2xl">
          {results.map((track) => (
            <button
              className="grid grid-cols-[36px_1fr_auto] items-center gap-2 border border-[#2b2b2b] bg-[#1a1a1a] p-2 text-left hover:border-[#666] focus:border-[#888] focus:outline-none"
              key={track.id}
              onClick={() => void handlePlayTrack(track)}
              type="button"
            >
              <img className="h-9 w-9 object-cover" src={track.album.images[0]?.url} alt="" />
              <span className="min-w-0 normal-case">
                <span className="block truncate text-xs text-white">{track.name}</span>
                <span className="block truncate text-[11px] text-[#999]">
                  {track.artists.map((artist) => artist.name).join(', ')}
                </span>
              </span>
              <span className="text-[10px] uppercase text-[#999]">Play</span>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  )
}

export const TrackSearchPanel = memo(TrackSearchPanelComponent)
