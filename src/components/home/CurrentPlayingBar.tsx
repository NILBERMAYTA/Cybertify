import { memo, useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '../../features/player/playerStore'
import { AudioVisualizer } from '../visualizer/AudioVisualizer'
import { paths } from '../../app/paths'
import { play, pause, skipToNext, skipToPrevious, getPlaybackState, setVolume } from '../../features/spotify/spotifyApi'
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

function SpeakerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  )
}

function DeviceIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
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
  const { currentTrack, isPlaying, albumImage, trackName, artistName, albumName, progressMs, durationMs, volumePercent, activeDevice, setPlaybackState } = usePlayerStore()

  const [glitchVariant, setGlitchVariant] = useState(1)

  useEffect(() => {
    setGlitchVariant(Math.floor(Math.random() * 3) + 1)
  }, [albumImage])

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

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value)
    usePlayerStore.getState().setVolumePercent(newVol) // Optimistic update
    const token = await getValidAccessToken(spotifyConfig)
    if (!token) return
    try {
      await setVolume(token, newVol)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div
      className="relative flex h-40 w-full cursor-pointer items-center justify-between border bg-[#1a1a1a] p-5 hover:bg-[#252525] transition-all duration-500 overflow-hidden"
      style={{
        borderColor: 'var(--color-dynamic-primary, #333)',
        boxShadow: '0 0 15px var(--color-dynamic-glow, transparent)',
      }}
      onClick={() => navigate(paths.player)}
    >
      {/* Left side: Image and text */}
      <div className="flex h-full flex-[1.5] items-center gap-6 overflow-hidden pr-4">
        {albumImage ? (
          <div className="relative h-full aspect-square border border-[#444]">
            <img src={albumImage} alt="Album" className="h-full w-full object-cover" />
            {isPlaying && (
              <div
                className={`absolute inset-0 pointer-events-none glitch-overlay-${glitchVariant}`}
                style={{ '--bg-image': `url(${albumImage})` } as React.CSSProperties}
              />
            )}
          </div>
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
      <div className="relative hidden h-full flex-[1.2] flex-col justify-end sm:flex pl-36 pr-4 pt-2 pb-3">
        <div className="h-[100%] w-full mb-1">
          <AudioVisualizer isPlaying={isPlaying} progressMs={progressMs} albumImage={albumImage} />
        </div>
        {/* Subtle Progress Bar under visualizer */}
        <div className="absolute bottom-1 left-36 right-4 h-[2px] bg-[#222]">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${durationMs > 0 ? (progressMs / durationMs) * 100 : 0}%`,
              backgroundColor: 'var(--color-dynamic-primary, #00f5ff)',
              boxShadow: '0 0 10px var(--color-dynamic-glow, transparent)'
            }}
          />
        </div>
      </div>

      {/* Right side: Controls */}
      <div className="flex flex-[1.5] flex-col items-end justify-center gap-3 pr-4">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={(e) => handleAction(e, 'prev')}
            className="flex h-10 w-10 items-center justify-center border text-[#999] hover:text-white"
            style={{ borderColor: 'var(--color-dynamic-primary, #333)' }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <SkipBackIcon size={20} />
          </motion.button>
          <motion.button
            onClick={(e) => handleAction(e, isPlaying ? 'pause' : 'play')}
            className="flex h-14 w-14 items-center justify-center border"
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
                {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <motion.button
            onClick={(e) => handleAction(e, 'next')}
            className="flex h-10 w-10 items-center justify-center border text-[#999] hover:text-white"
            style={{ borderColor: 'var(--color-dynamic-primary, #333)' }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <SkipForwardIcon size={20} />
          </motion.button>
        </div>

        {/* Volume & Device Info */}
        <div className="flex items-center gap-4 text-[#999] opacity-80 transition-opacity hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5" title="Active Device">
            <DeviceIcon size={12} />
            <span className="max-w-[100px] truncate text-[10px] uppercase tracking-wider">{activeDevice?.name ?? 'Cybertify'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SpeakerIcon size={12} />
            <input
              type="range"
              min="0"
              max="100"
              value={volumePercent}
              onChange={handleVolumeChange}
              className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-[#333] outline-none"
              style={{
                background: `linear-gradient(to right, var(--color-dynamic-primary, #00f5ff) ${volumePercent}%, #333 ${volumePercent}%)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const CurrentPlayingBar = memo(CurrentPlayingBarComponent)
