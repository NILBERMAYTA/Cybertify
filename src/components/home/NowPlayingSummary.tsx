import { memo, useEffect, useState } from 'react'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { getPlaybackState } from '../../features/spotify/spotifyApi'
import type { SpotifyPlaybackState } from '../../features/spotify/spotifyTypes'

function formatMs(ms: number | null | undefined) {
  if (!ms) {
    return '0:00'
  }

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function NowPlayingSummaryComponent() {
  const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null)
  const [status, setStatus] = useState('Loading playback...')

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlayback() {
      const accessToken = await getValidAccessToken(spotifyConfig)

      if (!accessToken) {
        setStatus('Login required')
        return
      }

      try {
        const state = await getPlaybackState(accessToken, controller.signal)
        setPlayback(state)
        setStatus(state?.item ? 'Playback detected' : 'Nothing playing')
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus(error instanceof Error ? error.message : 'Could not load playback')
        }
      }
    }

    void loadPlayback()
    const intervalId = window.setInterval(() => void loadPlayback(), 8000)

    return () => {
      window.clearInterval(intervalId)
      controller.abort()
    }
  }, [])

  const track = playback?.item

  if (!track) {
    return <p className="font-mono text-sm text-cyber-muted">{status}</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-[96px_1fr]">
      <img className="h-24 w-24 border border-cyber-pink/50 object-cover" src={track.album.images[0]?.url} alt="" />
      <div className="font-mono text-sm text-cyber-muted">
        <p className="mb-2 uppercase tracking-[0.22em] text-cyber-cyan">{playback.is_playing ? 'Playing now' : 'Paused'}</p>
        <h2 className="text-2xl font-black uppercase text-white">{track.name}</h2>
        <p>{track.artists.map((artist) => artist.name).join(', ')}</p>
        <p>Album: {track.album.name}</p>
        <p>
          Progress: {formatMs(playback.progress_ms)} / {formatMs(track.duration_ms)}
        </p>
        <p>Device: {playback.device?.name ?? 'Unknown'}</p>
      </div>
    </div>
  )
}

export const NowPlayingSummary = memo(NowPlayingSummaryComponent)
