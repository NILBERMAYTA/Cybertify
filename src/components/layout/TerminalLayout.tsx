import { memo, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../app/paths'
import { LyricsPanel } from '../lyrics/LyricsPanel'
import { PlayerCard } from '../player/PlayerCard'
import { PlaybackControls } from '../player/PlaybackControls'
import { DeviceSelector } from '../player/DeviceSelector'
import { PlaybackQueue } from '../player/PlaybackQueue'
import { TrackSearchPanel } from '../home/TrackSearchPanel'
import { AudioVisualizer } from '../visualizer/AudioVisualizer'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'
import {
  getPlaybackState,
  seekToPosition,
  SpotifyApiError,
} from '../../features/spotify/spotifyApi'
import { motion } from 'framer-motion'
import { TerminalPanel } from './TerminalPanel'
import { TerminalShell } from './TerminalShell'
import { extractColors } from '../../features/theme/extractColors'
import { disconnectWebPlayer } from '../../features/player/webPlaybackSdk'

const POLL_INTERVAL_MS = 1000

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function TerminalLayoutComponent() {
  const durationMs = usePlayerStore((state) => state.durationMs)
  const albumName = usePlayerStore((state) => state.albumName)
  const artistName = usePlayerStore((state) => state.artistName)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const progressMs = usePlayerStore((state) => state.progressMs)
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState)
  const trackName = usePlayerStore((state) => state.trackName)
  const albumImage = usePlayerStore((state) => state.albumImage)
  const [status, setStatus] = useState('sync ready')

  useEffect(() => {
    // Web player is initialized lazily when searching/playing a track
    // if no other device is available.
    return () => disconnectWebPlayer()
  }, [])

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

  const pollPlayback = useCallback(async (signal?: AbortSignal) => {
    const accessToken = await getValidAccessToken(spotifyConfig)

    if (!accessToken) {
      setStatus('login required')
      return null
    }

    try {
      const playback = await getPlaybackState(accessToken, signal)
      setPlaybackState(playback)
      setStatus(playback?.item ? 'online // sync' : 'waiting for Spotify playback')
      return null // no error, keep normal interval
    } catch (error) {
      if (signal?.aborted) {
        return null
      }

      if (error instanceof SpotifyApiError && error.status === 429) {
        const backoffMs = (error.retryAfterSeconds ?? 15) * 1000
        setStatus(`Spotify rate limit. Pausing ${Math.ceil(backoffMs / 1000)}s.`)
        return backoffMs
      }

      if (error instanceof SpotifyApiError && [502, 503, 504].includes(error.status)) {
        setStatus('Spotify gateway temporal. Reintentando...')
        return null
      }

      if (error instanceof Error && error.message.includes('Bad gateway')) {
        setStatus('Spotify gateway temporal. Reintentando...')
        return null
      }

      setStatus(error instanceof Error ? error.message : 'Spotify request failed')
      return null
    }
  }, [setPlaybackState])

  useEffect(() => {
    const controller = new AbortController()
    let timeoutId: number | undefined

    async function poll() {
      const backoffMs = await pollPlayback(controller.signal)

      if (controller.signal.aborted) return

      // If rate limited, wait longer before next poll
      const nextDelay = backoffMs ?? POLL_INTERVAL_MS
      timeoutId = window.setTimeout(poll, nextDelay)
    }

    void poll()

    return () => {
      controller.abort()
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [pollPlayback])

  const handleProgressClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!durationMs) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newPositionMs = Math.floor(percent * durationMs)
    
    // Optimistic UI update
    usePlayerStore.setState({ progressMs: newPositionMs })

    const accessToken = await getValidAccessToken(spotifyConfig)
    if (accessToken) {
      try {
        await seekToPosition(accessToken, newPositionMs)
        setTimeout(() => void pollPlayback(), 500)
      } catch (err) {
        console.error('Seek failed', err)
      }
    }
  }, [durationMs, pollPlayback])

  return (
    <TerminalShell contentClassName="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-3 py-3">
      <header 
        className="flex flex-wrap items-start justify-between gap-3 border bg-[#1a1a1a] px-4 py-2 text-xs uppercase tracking-wider transition-colors duration-500"
        style={{
          borderColor: 'var(--color-dynamic-primary, #333)',
          boxShadow: '0 0 10px var(--color-dynamic-glow, transparent)',
          color: 'var(--color-dynamic-primary, #999)'
        }}
      >
        <Link 
          className="shrink-0 py-2 transition-all duration-300 hover:brightness-150" 
          to={paths.home}
          style={{ textShadow: '0 0 5px var(--color-dynamic-glow, transparent)' }}
        >
          CYBERTIFY
        </Link>
        <TrackSearchPanel onTrackPlayed={() => void pollPlayback()} />
        <nav className="flex shrink-0 items-center gap-4 py-2">
          <Link 
            className="transition-all duration-300 hover:brightness-150" 
            to={paths.home}
            style={{ textShadow: '0 0 5px var(--color-dynamic-glow, transparent)' }}
          >
            home
          </Link>
          <span className="hidden opacity-70 sm:inline" style={{ textShadow: 'none' }}>{status}</span>
        </nav>
      </header>

      <section className="terminal-dashboard grid flex-1 gap-3">
        {/* Left column: track info + read-only progress */}
        <TerminalPanel className="terminal-left min-h-0 overflow-y-auto">
          <PlayerCard />

          <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-dynamic-primary, #00f5ff)', boxShadow: '0 -5px 15px -5px var(--color-dynamic-glow, rgba(0,245,255,0.3))' }}>
            {/* Read-only progress bar */}
            <div className="space-y-1 text-xs text-[#999]">
              <div 
                className="h-3 w-full border border-[#444] bg-[#222] cursor-pointer"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full"
                  style={{
                    backgroundColor: 'var(--color-dynamic-primary, #00f5ff)',
                    boxShadow: '0 0 5px var(--color-dynamic-glow, rgba(0, 245, 255, 0.3))',
                    width: `${Math.min(100, Math.max(0, (Math.floor(progressMs / 1000) / Math.floor((durationMs || 1) / 1000)) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between">
                <span>{formatMs(Math.floor(progressMs / 1000) * 1000)}</span>
                <span>{formatMs(durationMs)}</span>
              </div>
            </div>

            <div className="mt-4">
              <PlaybackControls onAction={() => void pollPlayback()} />
            </div>

            <div className="mt-3">
              <DeviceSelector onTransfer={() => void pollPlayback()} />
            </div>
          </div>
        </TerminalPanel>

        {/* Right column: lyrics on top, visualizer fills remaining space */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="terminal-lyrics flex min-h-0 flex-col border bg-[#1a1a1a]"
          style={{
            borderColor: 'var(--color-dynamic-primary, #00f5ff)',
            boxShadow: '0 0 15px var(--color-dynamic-glow, rgba(0, 245, 255, 0.3)), inset 0 0 15px var(--color-dynamic-glow, rgba(0, 245, 255, 0.3))'
          }}
        >
          <header
            className="border-b px-4 py-2 text-xs uppercase tracking-wider text-[#999]"
            style={{ borderColor: 'var(--color-dynamic-primary, #00f5ff)', textShadow: '0 0 5px var(--color-dynamic-primary, #00f5ff)' }}
          >
            lyrics
          </header>
          <div
            className="h-[60%] p-4 min-h-[150px] overflow-hidden border-b"
            style={{ borderColor: 'var(--color-dynamic-primary, #00f5ff)', boxShadow: 'inset 0 -5px 15px -5px var(--color-dynamic-glow, rgba(0,245,255,0.3))' }}
          >
            <LyricsPanel
              albumName={albumName}
              artistName={artistName}
              durationMs={durationMs}
              progressMs={progressMs}
              trackName={trackName}
            />
          </div>
          <div className="flex-1 px-4 py-2 opacity-70 min-h-[50px]">
            <AudioVisualizer isPlaying={isPlaying} progressMs={progressMs} albumImage={usePlayerStore((state) => state.albumImage)} />
          </div>
        </motion.div>

        {/* Right column: Playback queue */}
        <TerminalPanel className="terminal-queue min-h-0 overflow-y-auto">
          <PlaybackQueue />
        </TerminalPanel>
      </section>
    </TerminalShell>
  )
}

export const TerminalLayout = memo(TerminalLayoutComponent)
