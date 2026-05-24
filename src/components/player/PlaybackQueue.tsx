import { useEffect, useState } from 'react'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { spotifyConfig } from '../../app/config'
import { getQueue, play, skipToNext } from '../../features/spotify/spotifyApi'
import type { SpotifyTrack } from '../../features/spotify/spotifyTypes'
import { usePlayerStore } from '../../features/player/playerStore'

export function PlaybackQueue() {
  const [queue, setQueue] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id)
  const contextUri = usePlayerStore((state) => state.contextUri)

  useEffect(() => {
    let active = true

    async function fetchQueue() {
      const token = await getValidAccessToken(spotifyConfig)
      if (!token) return

      setLoading(true)
      try {
        const res = await getQueue(token)
        if (active && res) {
          setQueue(res.queue || [])
        }
      } catch (err) {
        console.error('Failed to fetch queue', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchQueue()

    return () => {
      active = false
    }
  }, [currentTrackId])

  if (!loading && queue.length === 0) {
    return null
  }

  const handlePlayQueueItem = async (index: number) => {
    const token = await getValidAccessToken(spotifyConfig)
    if (!token) return

    try {
      const track = queue[index]
      if (contextUri) {
        // If we are playing from a playlist/album context, skip directly to the track while maintaining context
        await play(token, { context_uri: contextUri, offset: { uri: track.uri } })
      } else {
        // If there's no context, skip sequentially to maintain the queue
        for (let i = 0; i <= index; i++) {
          await skipToNext(token)
        }
      }
    } catch (err) {
      console.error('Failed to play queue item', err)
    }
  }

  return (
    <div className="flex flex-col gap-2 h-full pr-1">
      {loading && queue.length === 0 ? (
        <div className="text-xs opacity-50 animate-pulse">loading queue...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {queue.slice(0, 15).map((track, idx) => (
            <div 
              key={`${track.id}-${idx}`} 
              onClick={() => void handlePlayQueueItem(idx)}
              className="flex items-center gap-3 text-xs group cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:bg-[#1a1a1a] hover:shadow-[0_0_10px_rgba(0,0,0,0.5)] p-1.5 -mx-1.5 rounded border border-transparent hover:border-[#333]"
            >
              <span className="opacity-40 w-4 text-right font-mono text-[10px]">{idx + 1}.</span>
              {track.album.images?.[0] && (
                <img 
                  src={track.album.images[0].url} 
                  alt={track.album.name} 
                  className="w-6 h-6 object-cover border border-[#333] transition-all"
                />
              )}
              <div className="truncate flex-1">
                <div className="truncate text-white/90 group-hover:text-white transition-colors">
                  {track.name}
                </div>
                <div className="truncate text-[10px] opacity-50">
                  {track.artists.map(a => a.name).join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
