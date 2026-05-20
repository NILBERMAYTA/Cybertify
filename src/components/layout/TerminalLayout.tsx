import { memo, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../app/paths'
import { LyricsPanel } from '../lyrics/LyricsPanel'
import { PlayerCard } from '../player/PlayerCard'
import { PlayerControls } from '../player/PlayerControls'
import { AudioVisualizer } from '../visualizer/AudioVisualizer'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'
import {
  addToQueue,
  getAvailableDevices,
  getPlaybackState,
  getQueue,
  getRecommendations,
  nextTrack,
  pause,
  play,
  previousTrack,
  seekToPosition,
  setVolume,
  SpotifyApiError,
  searchTracks,
  transferPlayback,
} from '../../features/spotify/spotifyApi'
import type { SpotifyDevice, SpotifyTrack } from '../../features/spotify/spotifyTypes'
import { TerminalPanel } from './TerminalPanel'
import { TerminalShell } from './TerminalShell'

function TerminalLayoutComponent() {
  const durationMs = usePlayerStore((state) => state.durationMs)
  const deviceId = usePlayerStore((state) => state.deviceId)
  const albumName = usePlayerStore((state) => state.albumName)
  const artistName = usePlayerStore((state) => state.artistName)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const progressMs = usePlayerStore((state) => state.progressMs)
  const pendingTrackUri = usePlayerStore((state) => state.pendingTrackUri)
  const setDeviceId = usePlayerStore((state) => state.setDeviceId)
  const setPendingTrackUri = usePlayerStore((state) => state.setPendingTrackUri)
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState)
  const trackName = usePlayerStore((state) => state.trackName)
  const webPlaybackStatus = usePlayerStore((state) => state.webPlaybackStatus)
  const [queue, setQueue] = useState<SpotifyTrack[]>([])
  const [smartQueue, setSmartQueue] = useState<SpotifyTrack[]>([])
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [volumePercent, setVolumePercent] = useState(50)
  const [status, setStatus] = useState('sync ready')
  const [queueStatus, setQueueStatus] = useState('smart queue ready')

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

    const queueResponse = await getQueue(accessToken, signal).catch(() => null)
    setQueue(queueResponse?.queue.slice(0, 8) ?? [])
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

  const shuffleTracks = useCallback((tracks: SpotifyTrack[]) => {
    return [...tracks].sort(() => Math.random() - 0.5)
  }, [])

  const handleGenerateSmartQueue = useCallback(async () => {
    const accessToken = await getValidAccessToken(spotifyConfig)

    if (!accessToken) {
      setQueueStatus('login required')
      return
    }

    if (!currentTrack) {
      setQueueStatus('no current track')
      return
    }

    const targetDeviceId = await resolveTargetDevice(accessToken)

    if (!targetDeviceId) {
      setQueueStatus('select active device first')
      return
    }

    setQueueStatus('building similar queue...')

    try {
      let candidates: SpotifyTrack[] = []

      try {
        const recommendations = await getRecommendations(accessToken, {
          limit: 24,
          seedArtistIds: currentTrack.artists[0]?.id ? [currentTrack.artists[0].id] : undefined,
          seedTrackIds: [currentTrack.id],
        })
        candidates = recommendations.tracks
      } catch {
        const fallback = await searchTracks(accessToken, `artist:"${currentTrack.artists[0]?.name ?? artistName}"`, 24)
        candidates = fallback.tracks.items
      }

      const randomizedTracks = shuffleTracks(candidates)
        .filter((track) => track.id !== currentTrack.id)
        .filter((track, index, allTracks) => allTracks.findIndex((candidate) => candidate.id === track.id) === index)
        .slice(0, 10)

      for (const track of randomizedTracks) {
        await addToQueue(accessToken, track.uri, { deviceId: targetDeviceId })
      }

      setSmartQueue(randomizedTracks)
      setQueueStatus(`added ${randomizedTracks.length} similar tracks`)
      await refreshPlayback()
    } catch (error) {
      setQueueStatus(normalizeSpotifyError(error))
    }
  }, [artistName, currentTrack, normalizeSpotifyError, refreshPlayback, resolveTargetDevice, shuffleTracks])

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
        <header className="terminal-frame flex items-center justify-between px-4 py-2 text-xs uppercase tracking-[0.48em] text-cyber-pink">
          <Link className="hover:text-cyber-cyan" to={paths.home}>
            * CYBERTIFY *
          </Link>
          <nav className="flex items-center gap-4 tracking-[0.22em]">
            <Link className="text-cyber-muted hover:text-cyber-cyan" to={paths.home}>
              home
            </Link>
            <span className="hidden text-cyber-muted sm:inline">{status}</span>
          </nav>
        </header>

        <section className="terminal-dashboard grid flex-1 gap-3">
          <aside className="terminal-left grid min-h-0 gap-3">
            <TerminalPanel title="track">
              <PlayerCard />
            </TerminalPanel>

            <TerminalPanel title="controls">
              <p className="mb-3 text-xs uppercase tracking-[0.12em] text-cyber-muted">{webPlaybackStatus}</p>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-cyber-muted" htmlFor="player-device">
                Device
              </label>
              <select
                className="mb-4 w-full border border-cyber-pink/50 bg-black/60 px-3 py-2 text-xs text-cyber-ice outline-none"
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
            </TerminalPanel>
          </aside>

          <TerminalPanel title="lyrics" className="terminal-lyrics min-h-0">
            <LyricsPanel
              albumName={albumName}
              artistName={artistName}
              durationMs={durationMs}
              progressMs={progressMs}
              trackName={trackName}
            />
            <div className="mt-6 border-t border-cyber-pink/30 pt-4">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-cyber-cyan">Queue</p>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <button className="terminal-button terminal-button-primary" onClick={() => void handleGenerateSmartQueue()} type="button">
                  Smart shuffle
                </button>
                <span className="text-xs text-cyber-muted">{queueStatus}</span>
              </div>
              <div className="grid gap-2">
                {queue.length ? (
                  queue.map((track) => (
                    <div className="grid grid-cols-[40px_1fr] gap-3 border border-cyber-cyan/15 bg-black/25 p-2" key={`${track.id}-${track.uri}`}>
                      <img className="h-10 w-10 object-cover" src={track.album.images[0]?.url} alt="" />
                      <div className="min-w-0 text-xs">
                        <p className="truncate text-white">{track.name}</p>
                        <p className="truncate text-cyber-muted">{track.artists.map((artist) => artist.name).join(', ')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-cyber-muted">Queue unavailable or empty.</p>
                )}
              </div>
              {smartQueue.length ? (
                <div className="mt-4 border-t border-cyber-cyan/20 pt-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.22em] text-cyber-cyan">Generated</p>
                  <div className="grid gap-2">
                    {smartQueue.map((track) => (
                      <div className="grid grid-cols-[40px_1fr] gap-3 border border-cyber-pink/15 bg-black/25 p-2" key={`smart-${track.id}`}>
                        <img className="h-10 w-10 object-cover" src={track.album.images[0]?.url} alt="" />
                        <div className="min-w-0 text-xs">
                          <p className="truncate text-white">{track.name}</p>
                          <p className="truncate text-cyber-muted">{track.artists.map((artist) => artist.name).join(', ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </TerminalPanel>

          <TerminalPanel title="visualizer" className="terminal-bottom">
            <div className="grid gap-4">
              <AudioVisualizer isPlaying={isPlaying} progressMs={progressMs} />
            </div>
          </TerminalPanel>
        </section>
    </TerminalShell>
  )
}

export const TerminalLayout = memo(TerminalLayoutComponent)
