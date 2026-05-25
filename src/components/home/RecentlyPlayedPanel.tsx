import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { getRecentlyPlayedTracks, play, SpotifyApiError } from '../../features/spotify/spotifyApi'
import type { SpotifyTrack } from '../../features/spotify/spotifyTypes'
import { spotifyConfig } from '../../app/config'

type RecentTrack = {
  track: SpotifyTrack
  played_at: string
}

function RecentlyPlayedPanelComponent() {
  const [tracks, setTracks] = useState<RecentTrack[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTracks() {
      try {
        const token = await getValidAccessToken(spotifyConfig)
        if (!token) {
          setError('No access token available.')
          return
        }

        const data = await getRecentlyPlayedTracks(token, 10, controller.signal)
        
        // Remove duplicates (recently played can have same track multiple times)
        const uniqueTracks = data.items.filter((item, index, self) =>
          index === self.findIndex((t) => t.track.id === item.track.id)
        )
        
        setTracks(uniqueTracks)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Error loading recently played')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadTracks()

    return () => controller.abort()
  }, [])

  const handlePlayTrack = useCallback(async (trackUri: string) => {
    const token = await getValidAccessToken(spotifyConfig)
    if (!token) return

    try {
      await play(token, { uris: [trackUri] })
    } catch (err) {
      if (err instanceof SpotifyApiError && err.status === 404) {
        alert('No active device found. Please start playback on a device first.')
      } else {
        console.error('Failed to play track', err)
      }
    }
  }, [])

  if (error) {
    return <div className="p-4 text-sm text-red-400">{error}</div>
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00f5ff] border-t-transparent"></div>
      </div>
    )
  }

  if (tracks.length === 0) {
    return <div className="p-4 text-sm text-[#999]">No hay canciones recientes.</div>
  }

  return (
    <div className="relative group/panel">
      <div 
        ref={scrollRef}
        className="flex w-full overflow-x-auto gap-4 pt-4 pb-6 px-1 scrollbar-hide snap-x scroll-smooth"
      >
        {tracks.map((item, index) => {
          const track = item.track
          const image = track.album.images[0]?.url

          return (
            <div 
              key={`${track.id}-${index}`}
              className="group relative flex min-w-[140px] max-w-[140px] snap-start flex-col gap-3 rounded-md border border-[#222] bg-[#141414] p-3 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-dynamic-primary,#444)] hover:shadow-[0_0_15px_var(--color-dynamic-glow,rgba(255,255,255,0.1))]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-[#222]">
                {image && <img src={image} alt={track.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                
                {/* Play Button Overlay */}
                <button
                  type="button"
                  onClick={() => handlePlayTrack(track.uri)}
                  className="absolute bottom-2 right-2 flex h-10 w-10 translate-y-4 items-center justify-center rounded-full bg-[var(--color-dynamic-primary,#1db954)] opacity-0 shadow-[0_4px_12px_var(--color-dynamic-glow,rgba(0,0,0,0.5))] transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-110"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="black">
                    <path d="M8 5v14l11-7L8 5z" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col">
                <span className="truncate text-sm font-bold text-white transition-colors group-hover:text-[var(--color-dynamic-primary,white)]">{track.name}</span>
                <span className="truncate text-xs text-[#888]">{track.artists.map(a => a.name).join(', ')}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const RecentlyPlayedPanel = memo(RecentlyPlayedPanelComponent)
