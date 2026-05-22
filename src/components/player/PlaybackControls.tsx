import { memo, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'
import {
  pause,
  play,
  seekToPosition,
  setShuffle,
  setRepeat,
  skipToNext,
  skipToPrevious,
  setVolume,
  SpotifyApiError,
} from '../../features/spotify/spotifyApi'

// ── SVG Icon Components ──────────────────────────────────────────────

function ShuffleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  )
}

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

function SeekBackwardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 17a7 7 0 1 0 0-10" />
      <polyline points="11 7 11 12 7 12" />
      <polyline points="11 12 11 7 7 7" />
    </svg>
  )
}

function SeekForwardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 17a7 7 0 1 1 0-10" />
      <polyline points="13 7 13 12 17 12" />
      <polyline points="13 12 13 7 17 7" />
    </svg>
  )
}

function RepeatIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function VolumeIcon({ level, size = 14 }: { level: number | null; size?: number }) {
  if (level === null || level === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {level > 30 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
      {level > 65 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
    </svg>
  )
}

// ── Animated Control Button ──────────────────────────────────────────

type ControlButtonProps = {
  ariaLabel: string
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
  title: string
  isActive?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

function ControlButton({ ariaLabel, children, disabled, onClick, title, isActive, className = '', size = 'md' }: ControlButtonProps) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  return (
    <motion.button
      aria-label={ariaLabel}
      className={`flex items-center justify-center rounded-sm ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
      whileHover={disabled ? undefined : { scale: 1.15 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      style={isActive ? { color: 'var(--color-dynamic-primary, #00f5ff)' } : undefined}
    >
      {children}
    </motion.button>
  )
}

// ── Main Component ───────────────────────────────────────────────────

type PlaybackControlsProps = {
  onAction?: () => void
}

const ACTION_COOLDOWN_MS = 300

function PlaybackControlsComponent({ onAction }: PlaybackControlsProps) {
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const shuffleState = usePlayerStore((state) => state.shuffleState)
  const repeatState = usePlayerStore((state) => state.repeatState)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const volumePercent = usePlayerStore((state) => state.volumePercent)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lastActionRef = useRef(0)
  const volumeDebounceRef = useRef<number>(0)

  const executeAction = useCallback(async (action: (token: string) => Promise<void>) => {
    const now = Date.now()
    if (now - lastActionRef.current < ACTION_COOLDOWN_MS) return
    lastActionRef.current = now

    const accessToken = await getValidAccessToken(spotifyConfig)
    if (!accessToken) {
      setError('Login required')
      return
    }

    setBusy(true)
    setError('')

    try {
      await action(accessToken)
      onAction?.()
    } catch (err) {
      if (err instanceof SpotifyApiError && err.status === 403) {
        setError('Spotify Premium required')
      } else if (err instanceof SpotifyApiError && err.status === 404) {
        setError('No active device')
      } else if (err instanceof SpotifyApiError && err.status === 429) {
        setError(`Rate limit. Wait ${err.retryAfterSeconds ?? 15}s`)
      } else {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    } finally {
      setBusy(false)
    }
  }, [onAction])

  const handlePlayPause = useCallback(() => {
    void executeAction((token) => isPlaying ? pause(token) : play(token))
  }, [executeAction, isPlaying])

  const handlePrevious = useCallback(() => {
    void executeAction((token) => skipToPrevious(token))
  }, [executeAction])

  const handleNext = useCallback(() => {
    void executeAction((token) => skipToNext(token))
  }, [executeAction])

  const handleShuffle = useCallback(() => {
    const newState = !shuffleState
    usePlayerStore.getState().setShuffleState(newState)
    void executeAction((token) => setShuffle(token, newState))
  }, [executeAction, shuffleState])

  const handleRepeat = useCallback(() => {
    const cycleMap = { off: 'context', context: 'track', track: 'off' } as const
    const newState = cycleMap[repeatState]
    usePlayerStore.getState().setRepeatState(newState)
    void executeAction((token) => setRepeat(token, newState))
  }, [executeAction, repeatState])

  const handleSeekBackward = useCallback(() => {
    const progressMs = usePlayerStore.getState().progressMs
    const newPosition = Math.max(0, progressMs - 10_000)
    void executeAction((token) => seekToPosition(token, newPosition))
  }, [executeAction])

  const handleSeekForward = useCallback(() => {
    const { progressMs, durationMs } = usePlayerStore.getState()
    const newPosition = Math.min(durationMs, progressMs + 10_000)
    void executeAction((token) => seekToPosition(token, newPosition))
  }, [executeAction])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value)
    usePlayerStore.getState().setVolumePercent(newVolume)

    window.clearTimeout(volumeDebounceRef.current)
    volumeDebounceRef.current = window.setTimeout(() => {
      void executeAction((token) => setVolume(token, newVolume))
    }, 500)
  }, [executeAction])

  const repeatLabel = repeatState === 'off' ? 'off' : repeatState === 'context' ? 'all' : 'one'
  const isDisabled = busy || !currentTrack

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Main controls row */}
      <div className="flex items-center justify-center gap-1">
        {/* Shuffle */}
        <ControlButton
          ariaLabel="Toggle shuffle"
          disabled={isDisabled}
          onClick={handleShuffle}
          title={`Shuffle: ${shuffleState ? 'on' : 'off'}`}
          isActive={shuffleState}
          size="sm"
          className={shuffleState ? '' : 'text-[#555] hover:text-[#999]'}
        >
          <ShuffleIcon size={14} />
        </ControlButton>

        {/* Seek backward 10s */}
        <ControlButton
          ariaLabel="Seek backward 10 seconds"
          disabled={isDisabled}
          onClick={handleSeekBackward}
          title="Back 10s"
          size="sm"
          className="text-[#777] hover:text-white disabled:text-[#333]"
        >
          <SeekBackwardIcon size={14} />
        </ControlButton>

        {/* Previous */}
        <ControlButton
          ariaLabel="Previous track"
          disabled={isDisabled}
          onClick={handlePrevious}
          title="Previous"
          className="text-[#999] hover:text-white disabled:text-[#333]"
        >
          <SkipBackIcon />
        </ControlButton>

        {/* Play / Pause — central, prominent */}
        <motion.button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="mx-1 flex h-10 w-10 items-center justify-center border disabled:opacity-30"
          style={{
            borderColor: 'var(--color-dynamic-primary, #00f5ff)',
            color: 'var(--color-dynamic-primary, #00f5ff)',
            boxShadow: '0 0 10px var(--color-dynamic-glow, rgba(0,245,255,0.3))',
          }}
          disabled={isDisabled}
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
          type="button"
          whileHover={isDisabled ? undefined : { scale: 1.1, boxShadow: '0 0 18px var(--color-dynamic-glow, rgba(0,245,255,0.5))' }}
          whileTap={isDisabled ? undefined : { scale: 0.92 }}
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
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* Next */}
        <ControlButton
          ariaLabel="Next track"
          disabled={isDisabled}
          onClick={handleNext}
          title="Next"
          className="text-[#999] hover:text-white disabled:text-[#333]"
        >
          <SkipForwardIcon />
        </ControlButton>

        {/* Seek forward 10s */}
        <ControlButton
          ariaLabel="Seek forward 10 seconds"
          disabled={isDisabled}
          onClick={handleSeekForward}
          title="Forward 10s"
          size="sm"
          className="text-[#777] hover:text-white disabled:text-[#333]"
        >
          <SeekForwardIcon size={14} />
        </ControlButton>

        {/* Repeat */}
        <div className="relative">
          <ControlButton
            ariaLabel="Toggle repeat"
            disabled={isDisabled}
            onClick={handleRepeat}
            title={`Repeat: ${repeatLabel}`}
            isActive={repeatState !== 'off'}
            size="sm"
            className={repeatState !== 'off' ? '' : 'text-[#555] hover:text-[#999]'}
          >
            <RepeatIcon size={14} />
          </ControlButton>
          {/* "1" badge for repeat-one mode */}
          <AnimatePresence>
            {repeatState === 'track' && (
              <motion.span
                className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold"
                style={{
                  backgroundColor: 'var(--color-dynamic-primary, #00f5ff)',
                  color: '#000',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                1
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status labels */}
      <div className="flex justify-center gap-4 text-[10px] uppercase tracking-wider text-[#555]">
        <span>shuffle: {shuffleState ? 'on' : 'off'}</span>
        <span>repeat: {repeatLabel}</span>
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#333]">
        <span className="text-[#666]">
          <VolumeIcon level={volumePercent} size={14} />
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={volumePercent}
          disabled={isDisabled}
          onChange={handleVolumeChange}
          className="h-1 flex-1 cursor-pointer appearance-none bg-[#444] outline-none"
          style={{
            background: `linear-gradient(to right, var(--color-dynamic-primary, #00f5ff) ${volumePercent}%, #444 ${volumePercent}%)`,
          }}
          aria-label="Volume"
        />
        <span className="w-6 text-right text-[10px] text-[#666]">{volumePercent}%</span>
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-center text-[10px] text-red-400"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export const PlaybackControls = memo(PlaybackControlsComponent)
