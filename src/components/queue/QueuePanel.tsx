import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'
import {
  addToQueue,
  getAvailableDevices,
  getQueue,
  getRecommendations,
  searchTracks,
  SpotifyApiError,
} from '../../features/spotify/spotifyApi'
import type { SpotifyTrack } from '../../features/spotify/spotifyTypes'

type QueuePanelProps = {
  onQueueChanged?: () => Promise<void> | void
}

function normalizeQueueError(error: unknown) {
  if (error instanceof SpotifyApiError && [502, 503, 504].includes(error.status)) {
    return 'Spotify gateway temporal.'
  }

  return error instanceof Error ? error.message : 'Queue request failed'
}

function QueuePanelComponent({ onQueueChanged }: QueuePanelProps) {
  const artistName = usePlayerStore((state) => state.artistName)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const deviceId = usePlayerStore((state) => state.deviceId)
  const setDeviceId = usePlayerStore((state) => state.setDeviceId)
  const [queue, setQueue] = useState<SpotifyTrack[]>([])
  const [smartQueue, setSmartQueue] = useState<SpotifyTrack[]>([])
  const [status, setStatus] = useState('smart queue ready')
  const lastAutoQueuedTrackRef = useRef<string | null>(null)
  const autoQueueInFlightRef = useRef(false)

  const refreshQueue = useCallback(async (signal?: AbortSignal) => {
    const accessToken = await getValidAccessToken(spotifyConfig)

    if (!accessToken) {
      setStatus('login required')
      return
    }

    const queueResponse = await getQueue(accessToken, signal).catch(() => null)
    setQueue(queueResponse?.queue.slice(0, 8) ?? [])
  }, [])

  const resolveTargetDevice = useCallback(async (accessToken: string) => {
    const deviceResponse = await getAvailableDevices(accessToken).catch(() => ({ devices: [] }))
    const availableDeviceIds = new Set(deviceResponse.devices.map((device) => device.id).filter(Boolean))
    const targetDeviceId =
      (deviceId && availableDeviceIds.has(deviceId) ? deviceId : null) ??
      deviceResponse.devices.find((device) => device.id)?.id ??
      null

    if (targetDeviceId) {
      setDeviceId(targetDeviceId)
    }

    return targetDeviceId
  }, [deviceId, setDeviceId])

  const shuffleTracks = useCallback((tracks: SpotifyTrack[]) => {
    return [...tracks].sort(() => Math.random() - 0.5)
  }, [])

  const generateSmartQueue = useCallback(async () => {
    if (autoQueueInFlightRef.current) {
      return
    }

    const accessToken = await getValidAccessToken(spotifyConfig)

    if (!accessToken) {
      setStatus('login required')
      return
    }

    if (!currentTrack) {
      setStatus('no current track')
      return
    }

    autoQueueInFlightRef.current = true
    setStatus('auto queue building...')

    try {
      const targetDeviceId = await resolveTargetDevice(accessToken)

      if (!targetDeviceId) {
        setStatus('select active device first')
        return
      }

      let candidates: SpotifyTrack[] = []

      try {
        const recommendations = await getRecommendations(accessToken, {
          limit: 10,
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
      setStatus(`added ${randomizedTracks.length} similar tracks`)
      lastAutoQueuedTrackRef.current = currentTrack.id
      await refreshQueue()
      await onQueueChanged?.()
    } catch (error) {
      setStatus(normalizeQueueError(error))
    } finally {
      autoQueueInFlightRef.current = false
    }
  }, [artistName, currentTrack, onQueueChanged, refreshQueue, resolveTargetDevice, shuffleTracks])

  useEffect(() => {
    const controller = new AbortController()

    void refreshQueue(controller.signal)
    const intervalId = window.setInterval(() => void refreshQueue(controller.signal), 7000)

    return () => {
      window.clearInterval(intervalId)
      controller.abort()
    }
  }, [refreshQueue])

  useEffect(() => {
    if (!currentTrack || queue.length >= 3 || lastAutoQueuedTrackRef.current === currentTrack.id) {
      return
    }

    void generateSmartQueue()
  }, [currentTrack, generateSmartQueue, queue.length])

  return (
    <div className="mt-4 border-t border-[#333] pt-3">
      <p className="mb-2 text-xs uppercase text-[#999]">Queue</p>
      <p className="mb-3 text-xs text-[#666]">Auto smart shuffle: {status}</p>
      <div className="grid gap-2">
        {queue.length ? (
          queue.map((track) => (
            <div className="grid grid-cols-[40px_1fr] gap-3 border border-[#333] bg-[#1a1a1a] p-2" key={`${track.id}-${track.uri}`}>
              <img className="h-10 w-10 object-cover" src={track.album.images[0]?.url} alt="" />
              <div className="min-w-0 text-xs">
                <p className="truncate text-white">{track.name}</p>
                <p className="truncate text-[#999]">{track.artists.map((artist) => artist.name).join(', ')}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#666]">Queue unavailable or empty.</p>
        )}
      </div>
      {smartQueue.length ? (
        <div className="mt-3 border-t border-[#333] pt-3">
          <p className="mb-2 text-xs uppercase text-[#999]">Generated</p>
          <div className="grid gap-2">
            {smartQueue.map((track) => (
              <div className="grid grid-cols-[40px_1fr] gap-3 border border-[#333] bg-[#1a1a1a] p-2" key={`smart-${track.id}`}>
                <img className="h-10 w-10 object-cover" src={track.album.images[0]?.url} alt="" />
                <div className="min-w-0 text-xs">
                  <p className="truncate text-white">{track.name}</p>
                  <p className="truncate text-[#999]">{track.artists.map((artist) => artist.name).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export const QueuePanel = memo(QueuePanelComponent)
