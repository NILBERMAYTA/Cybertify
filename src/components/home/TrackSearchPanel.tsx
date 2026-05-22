import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { play, searchTracks, SpotifyApiError } from '../../features/spotify/spotifyApi'
import type { SpotifyTrack } from '../../features/spotify/spotifyTypes'
import { getWebPlayerDeviceId } from '../../features/player/webPlaybackSdk'

const DEBOUNCE_MS = 400
const MIN_QUERY_LENGTH = 3

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
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<number>(0)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const executeSearch = useCallback(async (searchQuery: string, signal: AbortSignal) => {
    const cacheKey = searchQuery.toLowerCase()

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
    if (signal.aborted) return

    if (!accessToken) {
      setStatus('Login required')
      return
    }

    setStatus('Searching...')

    try {
      const response = await searchTracks(accessToken, searchQuery, 6, signal)
      if (signal.aborted) return

      cacheRef.current.set(cacheKey, response.tracks.items)
      setResults(response.tracks.items)
      setIsOpen(true)
      setStatus(response.tracks.items.length ? `${response.tracks.items.length} results` : 'No results')
    } catch (error) {
      if (signal.aborted) return

      if (error instanceof SpotifyApiError && error.status === 429) {
        const waitSeconds = error.retryAfterSeconds ?? 15
        cooldownUntilRef.current = Date.now() + waitSeconds * 1000
        setStatus(`Rate limit. Wait ${waitSeconds}s.`)
        return
      }

      if (error instanceof SpotifyApiError && error.status === 401) {
        setStatus('Session expired. Login again.')
        return
      }

      if (error instanceof DOMException && error.name === 'AbortError') return

      setStatus(error instanceof Error ? error.message : 'Search failed')
    }
  }, [])

  // Debounced search triggered by query changes
  useEffect(() => {
    const normalizedQuery = query.trim()

    // Clear previous debounce timer
    window.clearTimeout(debounceTimerRef.current)

    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      // Abort any in-flight request
      abortControllerRef.current?.abort()
      abortControllerRef.current = null

      if (normalizedQuery.length === 0) {
        setResults([])
        setIsOpen(false)
        setStatus('')
      } else {
        setStatus(`Type ${MIN_QUERY_LENGTH}+ chars`)
      }
      return
    }

    // Check cache immediately (no debounce needed)
    const cacheKey = normalizedQuery.toLowerCase()
    const cachedResults = cacheRef.current.get(cacheKey)
    if (cachedResults) {
      setResults(cachedResults)
      setIsOpen(true)
      setStatus(`${cachedResults.length} cached results`)
      return
    }

    setStatus('Typing...')

    debounceTimerRef.current = window.setTimeout(() => {
      // Abort any previous in-flight request
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      void executeSearch(normalizedQuery, controller.signal)
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(debounceTimerRef.current)
    }
  }, [query, executeSearch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      window.clearTimeout(debounceTimerRef.current)
    }
  }, [])

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
      if (error instanceof SpotifyApiError && error.status === 404 && error.message.toLowerCase().includes('device')) {
        const webDeviceId = getWebPlayerDeviceId()
        if (webDeviceId) {
          try {
            await play(accessToken, { uris: [track.uri], deviceId: webDeviceId })
            setStatus(`▶ ${track.name}`)
            onTrackPlayed?.()
            return
          } catch (retryError) {
            error = retryError
          }
        }
      }

      if (error instanceof SpotifyApiError && error.status === 429) {
        const waitSeconds = error.retryAfterSeconds ?? 15
        cooldownUntilRef.current = Date.now() + waitSeconds * 1000
        setStatus(`Rate limit. Wait ${waitSeconds}s.`)
        return
      }

      setStatus(error instanceof Error ? error.message : 'Play failed')
    }
  }, [onTrackPlayed])

  return (
    <div ref={wrapperRef} className="relative flex min-w-0 flex-1 sm:min-w-[320px]">
      <input
        className="w-full border border-[#444] bg-[#222] px-3 py-2 text-xs normal-case text-[#ddd] outline-none placeholder:text-[#666] focus:border-[#888]"
        aria-label="Search Spotify tracks"
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true)
        }}
        placeholder="Search song..."
        type="search"
        value={query}
      />
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
    </div>
  )
}

export const TrackSearchPanel = memo(TrackSearchPanelComponent)
