import { memo, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../app/paths'
import { LyricsPanel } from '../lyrics/LyricsPanel'
import { PlayerCard } from '../player/PlayerCard'
import { PlayerControls } from '../player/PlayerControls'
import { QueuePanel } from '../queue/QueuePanel'
import { AudioVisualizer } from '../visualizer/AudioVisualizer'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'
import {
  getAvailableDevices,
  getPlaybackState,
  nextTrack,
  pause,
  play,
  previousTrack,
  seekToPosition,
  setVolume,
  SpotifyApiError,
  transferPlayback,
} from '../../features/spotify/spotifyApi'
import type { SpotifyDevice } from '../../features/spotify/spotifyTypes'
import { motion } from 'framer-motion'
import { TerminalPanel } from './TerminalPanel'
import { TerminalShell } from './TerminalShell'
import { extractColors } from '../../features/theme/extractColors'

function TerminalLayoutComponent() {
  const durationMs = usePlayerStore((state) => state.durationMs)
  const activeDeviceId = usePlayerStore((state) => state.activeDeviceId)
  const deviceId = usePlayerStore((state) => state.deviceId)
  const webPlaybackDeviceId = usePlayerStore((state) => state.webPlaybackDeviceId)
  const albumName = usePlayerStore((state) => state.albumName)
  const artistName = usePlayerStore((state) => state.artistName)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const progressMs = usePlayerStore((state) => state.progressMs)
  const pendingTrackUri = usePlayerStore((state) => state.pendingTrackUri)
  const setDeviceId = usePlayerStore((state) => state.setDeviceId)
  const setPendingTrackUri = usePlayerStore((state) => state.setPendingTrackUri)
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState)
  const trackName = usePlayerStore((state) => state.trackName)
  const albumImage = usePlayerStore((state) => state.albumImage)
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [volumePercent, setVolumePercent] = useState(50)
  const [status, setStatus] = useState('sync ready')

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

  const normalizeSpotifyError = useCallback((error: unknown) => {
    if (error instanceof SpotifyApiError && [502, 503, 504].includes(error.status)) {
      return 'Spotify gateway temporal. Reintentando...'
    }

    if (error instanceof Error && error.message.includes('Bad gateway')) {
      return 'Spotify gateway temporal. Reintentando...'
    }

    return error instanceof Error ? error.message : 'Spotify command failed'
  }, [])

  const refreshPlayback = useCallback(async (signal?: AbortSignal) => {
    const accessToken = await getValidAccessToken(spotifyConfig)

    if (!accessToken) {
      setStatus('login required')
      return
    }

    const [playback, deviceResponse] = await Promise.all([
      getPlaybackState(accessToken, signal).catch((error) => {
        if (!signal?.aborted) {
          setStatus(normalizeSpotifyError(error))
        }

        return null
      }),
      getAvailableDevices(accessToken, signal).catch((error) => {
        if (!signal?.aborted) {
          setStatus(normalizeSpotifyError(error))
        }

        return { devices: [] }
      }),
    ])

    setPlaybackState(playback)
    setVolumePercent(playback?.device?.volume_percent ?? 50)
    const availableDeviceIds = new Set(deviceResponse.devices.map((device) => device.id).filter(Boolean))
    setDevices(deviceResponse.devices)
    setSelectedDeviceId((currentDeviceId) => {
      if (currentDeviceId && availableDeviceIds.has(currentDeviceId)) {
        return currentDeviceId
      }

      if (webPlaybackDeviceId && availableDeviceIds.has(webPlaybackDeviceId)) {
        return webPlaybackDeviceId
      }

      if (playback?.device?.id && availableDeviceIds.has(playback.device.id)) {
        return playback.device.id
      }

      return deviceResponse.devices.find((device) => device.id)?.id ?? ''
    })

    setStatus(playback?.device?.id ? 'online // sync' : 'select active device')
  }, [normalizeSpotifyError, setPlaybackState, webPlaybackDeviceId])

  const resolveTargetDevice = useCallback(
    async (accessToken: string) => {
      const deviceResponse = await getAvailableDevices(accessToken).catch(() => ({ devices: [] }))
      const availableDeviceIds = new Set(deviceResponse.devices.map((device) => device.id).filter(Boolean))
      const firstAvailableDeviceId = deviceResponse.devices.find((device) => device.id)?.id ?? null
      const nextDeviceId =
        (selectedDeviceId && availableDeviceIds.has(selectedDeviceId) ? selectedDeviceId : null) ??
        (webPlaybackDeviceId && availableDeviceIds.has(webPlaybackDeviceId) ? webPlaybackDeviceId : null) ??
        (deviceId && availableDeviceIds.has(deviceId) ? deviceId : null) ??
        (activeDeviceId && availableDeviceIds.has(activeDeviceId) ? activeDeviceId : null) ??
        firstAvailableDeviceId

      setDevices(deviceResponse.devices)
      setSelectedDeviceId(nextDeviceId ?? '')

      if (nextDeviceId) {
        setDeviceId(nextDeviceId)
      }

      return nextDeviceId
    },
    [activeDeviceId, deviceId, selectedDeviceId, setDeviceId, webPlaybackDeviceId],
  )

  useEffect(() => {
    const controller = new AbortController()

    void refreshPlayback(controller.signal)
    const intervalId = window.setInterval(() => void refreshPlayback(controller.signal), 5000)

    return () => {
      window.clearInterval(intervalId)
      controller.abort()
    }
  }, [refreshPlayback])

  const runPlayerCommand = useCallback(
    async (command: (accessToken: string, targetDeviceId?: string) => Promise<void>) => {
      const accessToken = await getValidAccessToken(spotifyConfig)

      if (!accessToken) {
        setStatus('login required')
        return
      }

      const targetDeviceId = await resolveTargetDevice(accessToken)

      if (!targetDeviceId) {
        setStatus('No active device. Open Spotify on a device, then refresh.')
        await refreshPlayback()
        return
      }

      try {
        if (targetDeviceId !== activeDeviceId) {
          await transferPlayback(accessToken, targetDeviceId, false)
        }

        await command(accessToken, targetDeviceId)
        await refreshPlayback()
      } catch (error) {
        if (error instanceof Error && error.message.includes('Device not found')) {
          setDeviceId(null)
          setSelectedDeviceId('')
          await refreshPlayback()
          setStatus('Device expired. Recreated device, try again.')
          return
        }

        const message = normalizeSpotifyError(error)
        setStatus(message.includes('No active device') ? 'No active device. Select a device or open Spotify.' : message)
      }
    },
    [activeDeviceId, normalizeSpotifyError, refreshPlayback, resolveTargetDevice, setDeviceId],
  )

  const handlePlayPause = useCallback(() => {
    void runPlayerCommand((accessToken, targetDeviceId) =>
      isPlaying ? pause(accessToken, { deviceId: targetDeviceId }) : play(accessToken, { deviceId: targetDeviceId }),
    )
  }, [isPlaying, runPlayerCommand])

  const handleNext = useCallback(() => {
    void runPlayerCommand((accessToken, targetDeviceId) => nextTrack(accessToken, { deviceId: targetDeviceId }))
  }, [runPlayerCommand])

  const handlePrevious = useCallback(() => {
    void runPlayerCommand((accessToken, targetDeviceId) => previousTrack(accessToken, { deviceId: targetDeviceId }))
  }, [runPlayerCommand])

  const handleSeek = useCallback(
    (positionMs: number) => {
      void runPlayerCommand((accessToken, targetDeviceId) => seekToPosition(accessToken, positionMs, { deviceId: targetDeviceId }))
    },
    [runPlayerCommand],
  )

  const handleVolume = useCallback(
    (value: number) => {
      setVolumePercent(value)
      void runPlayerCommand((accessToken, targetDeviceId) => setVolume(accessToken, value, { deviceId: targetDeviceId }))
    },
    [runPlayerCommand],
  )

  const handleDeviceChange = useCallback(
    async (nextDeviceId: string) => {
      setSelectedDeviceId(nextDeviceId)

      const accessToken = await getValidAccessToken(spotifyConfig)

      if (!accessToken || !nextDeviceId) {
        return
      }

      try {
        await transferPlayback(accessToken, nextDeviceId, false)
        await refreshPlayback()
      } catch (error) {
        setStatus(normalizeSpotifyError(error))
      }
    },
    [normalizeSpotifyError, refreshPlayback],
  )

  useEffect(() => {
    if (!pendingTrackUri) {
      return
    }

    void runPlayerCommand(async (accessToken, targetDeviceId) => {
      await play(accessToken, { deviceId: targetDeviceId, uris: [pendingTrackUri] })
      setPendingTrackUri(null)
    })
  }, [pendingTrackUri, runPlayerCommand, setPendingTrackUri])

  return (
    <TerminalShell contentClassName="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-3 py-3">
        <header className="flex items-center justify-between border border-[#333] bg-[#1a1a1a] px-4 py-2 text-xs uppercase tracking-wider text-[#999]">
          <Link className="hover:text-white" to={paths.home}>
            CYBERTIFY
          </Link>
          <nav className="flex items-center gap-4">
            <Link className="text-[#999] hover:text-white" to={paths.home}>
              home
            </Link>
            <span className="hidden text-[#666] sm:inline">{status}</span>
          </nav>
        </header>

        <section className="terminal-dashboard grid flex-1 gap-3">
          {/* Left column: track + controls */}
          <TerminalPanel className="terminal-left min-h-0 overflow-y-auto">
            <PlayerCard />

            <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-dynamic-primary, #00f5ff)', boxShadow: '0 -5px 15px -5px var(--color-dynamic-glow, rgba(0,245,255,0.3))' }}>
              <PlayerControls
                durationMs={durationMs}
                isPlaying={isPlaying}
                onNext={handleNext}
                onPlayPause={handlePlayPause}
                onPrevious={handlePrevious}
                onSeek={handleSeek}
                onVolumeChange={handleVolume}
                progressMs={progressMs}
                volumePercent={volumePercent}
              />
              <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-dynamic-primary, #00f5ff)', boxShadow: '0 -5px 15px -5px var(--color-dynamic-glow, rgba(0,245,255,0.3))' }}>
                <label className="mb-1 block text-xs uppercase text-[#999]" htmlFor="player-device">
                  Device
                </label>
                <select
                  className="w-full border border-[#444] bg-[#222] px-3 py-2 text-xs text-[#ddd] outline-none"
                  id="player-device"
                  onChange={(event) => void handleDeviceChange(event.target.value)}
                  value={selectedDeviceId}
                >
                  <option value="">No device found</option>
                  {devices.map((device) => (
                    <option disabled={!device.id} key={device.id ?? device.name} value={device.id ?? ''}>
                      {device.name} {device.is_active ? '(active)' : ''}
                    </option>
                  ))}
                </select>
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
              <AudioVisualizer isPlaying={isPlaying} progressMs={progressMs} />
            </div>
          </motion.div>

          {/* Bottom: queue spanning full width */}
          <TerminalPanel title="queue" className="terminal-queue">
            <QueuePanel onQueueChanged={refreshPlayback} />
          </TerminalPanel>
        </section>
    </TerminalShell>
  )
}

export const TerminalLayout = memo(TerminalLayoutComponent)
