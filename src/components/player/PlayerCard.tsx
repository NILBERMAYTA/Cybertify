import { memo } from 'react'
import { motion } from 'framer-motion'
import { usePlayerStore } from '../../features/player/playerStore'
import { AlbumCover } from './AlbumCover'

function PlayerCardComponent() {
  const albumImage = usePlayerStore((state) => state.albumImage)
  const albumName = usePlayerStore((state) => state.albumName)
  const artistName = usePlayerStore((state) => state.artistName)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const trackName = usePlayerStore((state) => state.trackName)

  return (
    <motion.article
      className="space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <motion.div
        animate={{ scale: isPlaying ? 1 : 0.985 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <AlbumCover imageUrl={albumImage} title={trackName || 'Track artwork'} />
      </motion.div>

      <motion.div
        className="space-y-2 text-xs uppercase tracking-[0.12em]"
        key={`${trackName}-${artistName}-${albumName}`}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <p className="text-cyber-muted">Title</p>
        <h2 className="glitch-text break-words text-xl font-black text-white" data-text={trackName || 'NO SIGNAL'}>
          {trackName || 'NO SIGNAL'}
        </h2>
        <p className="text-cyber-muted">Artist</p>
        <p className="break-words text-cyber-cyan">{artistName || 'Awaiting Spotify'}</p>
        <p className="text-cyber-muted">Album</p>
        <p className="break-words text-cyber-ice">{albumName || 'Unknown album'}</p>
        <p className="text-cyber-muted">Status</p>
        <p className={isPlaying ? 'text-cyber-cyan' : 'text-cyber-pink'}>{isPlaying ? 'playing' : 'paused'}</p>
      </motion.div>
    </motion.article>
  )
}

export const PlayerCard = memo(PlayerCardComponent)
