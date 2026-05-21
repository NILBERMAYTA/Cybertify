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
import { TerminalPanel } from './TerminalPanel'
import { TerminalShell } from './TerminalShell'

function TerminalLayoutComponent() {
  const durationMs = usePlayerStore((state) => state.durationMs)
  const deviceId = usePlayerStore((state) => state.deviceId)
  const albumName = usePlayerStore((state) => state.albumName)
  const artistName = usePlayerStore((state) => state.artistName)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const progressMs = usePlayerStore((state) => state.progressMs)
  const pendingTrackUri = usePlayerStore((state) => state.pendingTrackUri)
  const setDeviceId = usePlayerStore((state) => state.setDeviceId)
  const setPendingTrackUri = usePlayerStore((state) => state.setPendingTrackUri)
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState)
  const trackName = usePlayerStore((state) => state.trackName)
  const webPlaybackStatus = usePlayerStore((state) => state.webPlaybackStatus)
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [volumePercent, setVolumePercent] = useState(50)
  const [status, setStatus] = useState('sync ready')

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
      if (playback?.device?.id && availableDeviceIds.has(playback.device.id)) {
        return playback.device.id
      }

      if (currentDeviceId && availableDeviceIds.has(currentDeviceId)) {
        return currentDeviceId
      }

      return deviceResponse.devices.find((device) => device.id)?.id ?? ''
    })

    setStatus(playback?.device?.id ? 'online // sync' : 'select active device')
  }, [normalizeSpotifyError, setPlaybackState])

  const resolveTargetDevice = useCallback(
    async (accessToken: string) => {
      const deviceResponse = await getAvailableDevices(accessToken).catch(() => ({ devices: [] }))
      const availableDeviceIds = new Set(deviceResponse.devices.map((device) => device.id).filter(Boolean))
      const nextDeviceId =
        (deviceId && availableDeviceIds.has(deviceId) ? deviceId : null) ??
        (selectedDeviceId && availableDeviceIds.has(selectedDeviceId) ? selectedDeviceId : null) ??
        deviceResponse.devices.find((device) => device.id)?.id ??
        null

      setDevices(deviceResponse.devices)
      setSelectedDeviceId(nextDeviceId ?? '')

      if (nextDeviceId) {
        setDeviceId(nextDeviceId)
      }

      return nextDeviceId
    },
    [deviceId, selectedDeviceId, setDeviceId],
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
        if (!deviceId) {
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
    [deviceId, normalizeSpotifyError, refreshPlayback, resolveTargetDevice, selectedDeviceId, setDeviceId],
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

            <div className="mt-4 border-t border-[#333] pt-3">
              <p className="mb-2 text-xs uppercase text-[#666]">{webPlaybackStatus}</p>
              <label className="mb-1 block text-xs uppercase text-[#999]" htmlFor="player-device">
                Device
              </label>
              <select
                className="mb-3 w-full border border-[#444] bg-[#222] px-3 py-2 text-xs text-[#ddd] outline-none"
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
            </div>
          </TerminalPanel>

          {/* Right column: lyrics on top, visualizer fills remaining space */}
          <div className="terminal-lyrics flex min-h-0 flex-col border border-[#333] bg-[#1a1a1a]">
            <header className="border-b border-[#333] px-4 py-2 text-xs uppercase tracking-wider text-[#999]">
              lyrics
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              <LyricsPanel
                albumName={albumName}
                artistName={artistName}
                durationMs={durationMs}
                progressMs={progressMs}
                trackName={trackName}
              />
            </div>
            <div className="flex min-h-[100px] flex-1 border-t border-[#333]">
              <AudioVisualizer isPlaying={isPlaying} progressMs={progressMs} />
            </div>
          </div>

          {/* Bottom: queue spanning full width */}
          <TerminalPanel title="queue" className="terminal-queue">
            <QueuePanel onQueueChanged={refreshPlayback} />
          </TerminalPanel>
        </section>
    </TerminalShell>
  )
}

export const TerminalLayout = memo(TerminalLayoutComponent)
