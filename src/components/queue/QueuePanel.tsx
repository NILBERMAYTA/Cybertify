import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'
import {
  addToQueue,
  getAvailableDevices,
  getQueue,
  play,
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
  const activeDeviceId = usePlayerStore((state) => state.activeDeviceId)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const deviceId = usePlayerStore((state) => state.deviceId)
  const setDeviceId = usePlayerStore((state) => state.setDeviceId)
  const webPlaybackDeviceId = usePlayerStore((state) => state.webPlaybackDeviceId)
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
      (webPlaybackDeviceId && availableDeviceIds.has(webPlaybackDeviceId) ? webPlaybackDeviceId : null) ??
      (deviceId && availableDeviceIds.has(deviceId) ? deviceId : null) ??
      (activeDeviceId && availableDeviceIds.has(activeDeviceId) ? activeDeviceId : null) ??
      deviceResponse.devices.find((device) => device.id)?.id ??
      null

    if (targetDeviceId) {
      setDeviceId(targetDeviceId)
    }

    return targetDeviceId
  }, [activeDeviceId, deviceId, setDeviceId, webPlaybackDeviceId])

  const shuffleItems = useCallback(<T,>(items: T[]) => {
    const shuffled = [...items]

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }

    return shuffled
  }, [])

  const getRandomQueueCandidates = useCallback(
    async (accessToken: string) => {
      const primaryArtist = currentTrack?.artists[0]?.name ?? artistName
      const secondaryArtist = currentTrack?.artists[1]?.name
      const trackKeyword = currentTrack?.name.split(/\s+/).find((word) => word.length > 3)
      const randomYear = 1980 + Math.floor(Math.random() * 47)
      const randomLetter = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
      const queries = shuffleItems(
        [
          primaryArtist ? `artist:"${primaryArtist}"` : '',
          secondaryArtist ? `artist:"${secondaryArtist}"` : '',
          trackKeyword ? `${trackKeyword} year:${randomYear}` : '',
          `${randomLetter} year:${randomYear}`,
          `tag:new ${randomLetter}`,
        ].filter(Boolean),
      ).slice(0, 3)

      const responses = await Promise.allSettled(queries.map((query) => searchTracks(accessToken, query, 50)))

      return responses.flatMap((response) => (response.status === 'fulfilled' ? response.value.tracks.items : []))
    },
    [artistName, currentTrack, shuffleItems],
  )

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

      const candidates = await getRandomQueueCandidates(accessToken)

      const randomizedTracks = shuffleItems(candidates)
        .filter((track) => track.id !== currentTrack.id)
        .filter((track, index, allTracks) => allTracks.findIndex((candidate) => candidate.id === track.id) === index)
        .slice(0, 10)

      for (const track of randomizedTracks) {
        await addToQueue(accessToken, track.uri, { deviceId: targetDeviceId })
      }

      setSmartQueue(randomizedTracks)
      setStatus(`added ${randomizedTracks.length} random tracks`)
      lastAutoQueuedTrackRef.current = currentTrack.id
      await refreshQueue()
      await onQueueChanged?.()
    } catch (error) {
      setStatus(normalizeQueueError(error))
    } finally {
      autoQueueInFlightRef.current = false
    }
  }, [currentTrack, getRandomQueueCandidates, onQueueChanged, refreshQueue, resolveTargetDevice, shuffleItems])

  const handlePlayTrack = useCallback(
    async (track: SpotifyTrack) => {
      const accessToken = await getValidAccessToken(spotifyConfig)

      if (!accessToken) {
        setStatus('login required')
        return
      }

      try {
        const targetDeviceId = await resolveTargetDevice(accessToken)

        if (!targetDeviceId) {
          setStatus('select active device first')
          return
        }

        await play(accessToken, { deviceId: targetDeviceId, uris: [track.uri] })
        setStatus(`playing ${track.name}`)
        await refreshQueue()
        await onQueueChanged?.()
      } catch (error) {
        setStatus(normalizeQueueError(error))
      }
    },
    [onQueueChanged, refreshQueue, resolveTargetDevice],
  )

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
      <p className="mb-3 text-xs text-[#666]">Auto random queue: {status}</p>
      <div className="grid gap-2">
        {queue.length ? (
          queue.map((track) => (
            <button
              className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border border-[#333] bg-[#1a1a1a] p-2 text-left hover:border-[#666] focus:border-[#888] focus:outline-none"
              key={`${track.id}-${track.uri}`}
              onClick={() => void handlePlayTrack(track)}
              type="button"
            >
              <img className="h-10 w-10 object-cover" src={track.album.images[0]?.url} alt="" />
              <div className="min-w-0 text-xs">
                <p className="truncate text-white">{track.name}</p>
                <p className="truncate text-[#999]">{track.artists.map((artist) => artist.name).join(', ')}</p>
              </div>
              <span className="text-xs uppercase text-[#999]">Play</span>
            </button>
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
              <button
                className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border border-[#333] bg-[#1a1a1a] p-2 text-left hover:border-[#666] focus:border-[#888] focus:outline-none"
                key={`smart-${track.id}`}
                onClick={() => void handlePlayTrack(track)}
                type="button"
              >
                <img className="h-10 w-10 object-cover" src={track.album.images[0]?.url} alt="" />
                <div className="min-w-0 text-xs">
                  <p className="truncate text-white">{track.name}</p>
                  <p className="truncate text-[#999]">{track.artists.map((artist) => artist.name).join(', ')}</p>
                </div>
                <span className="text-xs uppercase text-[#999]">Play</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export const QueuePanel = memo(QueuePanelComponent)
