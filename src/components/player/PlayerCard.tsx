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
      <AlbumCover imageUrl={albumImage} title={trackName || 'Track artwork'} />
      <div className="space-y-1 text-xs uppercase tracking-wider">
        <p className="text-[#999]">Title</p>
        <h2 className="terminal-glow-text break-words text-xl font-bold text-white">
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
