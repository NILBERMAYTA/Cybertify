import { memo } from 'react'
import { usePlayerStore } from '../../features/player/playerStore'
import { AlbumCover } from './AlbumCover'

function PlayerCardComponent() {
  const albumImage = usePlayerStore((state) => state.albumImage)
  const albumName = usePlayerStore((state) => state.albumName)
  const artistName = usePlayerStore((state) => state.artistName)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const trackName = usePlayerStore((state) => state.trackName)

  return (
    <article className="space-y-4">
      <AlbumCover imageUrl={albumImage} title={trackName || 'Track artwork'} isPlaying={isPlaying} />
      <div className="space-y-1 text-xs uppercase tracking-wider">
        <p className="text-[#999]">Title</p>
        <h2
          className="break-words text-xl font-bold text-white"
          style={{ 
            textShadow: '0 0 4px #ffffff, 0 0 15px var(--color-dynamic-primary, #00f5ff), 0 0 30px var(--color-dynamic-primary, #00f5ff)' 
          }}
        >
          {trackName || 'NO SIGNAL'}
        </h2>
        <p className="text-[#999]">Artist</p>
        <p className="break-words text-[#ccc]">{artistName || 'Awaiting Spotify'}</p>
        <p className="text-[#999]">Album</p>
        <p className="break-words text-[#ccc]">{albumName || 'Unknown album'}</p>
        <p className="text-[#999]">Status</p>
        <p className={isPlaying ? 'text-green-400' : 'text-red-400'}>{isPlaying ? 'playing' : 'paused'}</p>
      </div>
    </article>
  )
}

export const PlayerCard = memo(PlayerCardComponent)
