import { memo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '../../features/player/playerStore'
import { AudioVisualizer } from '../visualizer/AudioVisualizer'
import { paths } from '../../app/paths'
import { play, pause, skipToNext, skipToPrevious, getPlaybackState } from '../../features/spotify/spotifyApi'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { spotifyConfig } from '../../app/config'
import { extractColors } from '../../features/theme/extractColors'

function SkipBackIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </svg>
  )
}

function PlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}

function PauseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  )
}

function SkipForwardIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
    </svg>
  )
}

const POLL_INTERVAL_MS = 1000

function CurrentPlayingBarComponent() {
  const navigate = useNavigate()
  const { currentTrack, isPlaying, albumImage, trackName, artistName, albumName, progressMs, setPlaybackState } = usePlayerStore()

  const pollPlayback = useCallback(async (signal?: AbortSignal) => {
    const accessToken = await getValidAccessToken(spotifyConfig)
    if (!accessToken) return null

    try {
      const playback = await getPlaybackState(accessToken, signal)
      setPlaybackState(playback)
      return null
    } catch (error) {
      return null
    }
  }, [setPlaybackState])

  useEffect(() => {
    const controller = new AbortController()
    let timeoutId: number | undefined

    async function poll() {
      await pollPlayback(controller.signal)
      if (controller.signal.aborted) return
      timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
    }

    void poll()

    return () => {
      controller.abort()
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [pollPlayback])

  useEffect(() => {
    if (!albumImage) {
      document.documentElement.style.setProperty('--color-dynamic-primary', '#00f5ff')
      document.documentElement.style.setProperty('--color-dynamic-glow', 'rgba(0, 245, 255, 0.3)')
      return
    }

    let active = true
    extractColors(albumImage)
      .then((colors) => {
        if (active) {
          document.documentElement.style.setProperty('--color-dynamic-primary', colors.primaryColor)
          document.documentElement.style.setProperty('--color-dynamic-glow', colors.glowColor)
        }
      })
      .catch(() => {
        if (active) {
          document.documentElement.style.setProperty('--color-dynamic-primary', '#00f5ff')
          document.documentElement.style.setProperty('--color-dynamic-glow', 'rgba(0, 245, 255, 0.3)')
        }
      })

    return () => {
      active = false
    }
  }, [albumImage])

  if (!currentTrack) {
    return null
  }

  const handleAction = async (e: React.MouseEvent, action: 'play' | 'pause' | 'prev' | 'next') => {
    e.stopPropagation()
    const token = await getValidAccessToken(spotifyConfig)
    if (!token) return

    try {
      if (action === 'play') await play(token)
      if (action === 'pause') await pause(token)
      if (action === 'prev') await skipToPrevious(token)
      if (action === 'next') await skipToNext(token)
      
      // Fast poll after action
      setTimeout(() => void pollPlayback(), 500)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div 
      className="flex h-40 w-full cursor-pointer items-center justify-between border bg-[#1a1a1a] p-5 hover:bg-[#252525] transition-all duration-500"
      style={{
        borderColor: 'var(--color-dynamic-primary, #333)',
        boxShadow: '0 0 15px var(--color-dynamic-glow, transparent)',
      }}
      onClick={() => navigate(paths.player)}
    >
      {/* Left side: Image and text */}
      <div className="flex h-full flex-[1.5] items-center gap-6 overflow-hidden pr-4">
        {albumImage ? (
          <img src={albumImage} alt="Album" className="h-full aspect-square border border-[#444] object-cover" />
        ) : (
          <div className="h-full aspect-square border border-[#444] bg-[#222]" />
        )}
        <div className="flex min-w-0 flex-col justify-center gap-2">
          <span 
            className="line-clamp-2 whitespace-normal break-words text-xl font-bold text-white leading-tight"
            style={{ textShadow: '0 0 10px var(--color-dynamic-glow, transparent)' }}
          >
            {trackName}
          </span>
          <span className="truncate text-base text-[#999] leading-none">{artistName}</span>
          <span className="truncate text-sm text-[#666] leading-none">{albumName}</span>
        </div>
      </div>

      {/* Middle: Visualizer */}
      <div className="hidden h-full flex-1 sm:block px-8 py-2">
         <div className="h-full w-full">
            <AudioVisualizer isPlaying={isPlaying} progressMs={progressMs} albumImage={albumImage} />
         </div>
      </div>

      {/* Right side: Controls */}
      <div className="flex flex-1 items-center justify-end gap-5 pr-4">
        <motion.button 
          onClick={(e) => handleAction(e, 'prev')}
          className="flex h-12 w-12 items-center justify-center border text-[#999] hover:text-white"
          style={{ borderColor: 'var(--color-dynamic-primary, #333)' }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <SkipBackIcon size={22} />
        </motion.button>
        <motion.button 
          onClick={(e) => handleAction(e, isPlaying ? 'pause' : 'play')}
          className="flex h-16 w-16 items-center justify-center border"
          style={{ 
            borderColor: 'var(--color-dynamic-primary, #00f5ff)',
            color: 'var(--color-dynamic-primary, #00f5ff)',
            boxShadow: '0 0 12px var(--color-dynamic-glow, rgba(0,245,255,0.4))'
          }}
          whileHover={{ scale: 1.1, boxShadow: '0 0 20px var(--color-dynamic-glow, rgba(0,245,255,0.6))' }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isPlaying ? 'pause' : 'play'}
              initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              {isPlaying ? <PauseIcon size={32} /> : <PlayIcon size={32} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <motion.button 
          onClick={(e) => handleAction(e, 'next')}
          className="flex h-12 w-12 items-center justify-center border text-[#999] hover:text-white"
          style={{ borderColor: 'var(--color-dynamic-primary, #333)' }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <SkipForwardIcon size={22} />
        </motion.button>
      </div>
    </div>
  )
}

export const CurrentPlayingBar = memo(CurrentPlayingBarComponent)
