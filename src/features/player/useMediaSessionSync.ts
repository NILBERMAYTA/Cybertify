import { useEffect } from 'react'
import { usePlayerStore } from './playerStore'
import { getValidAccessToken } from '../auth/spotifyAuth'
import { spotifyConfig } from '../../app/config'
import { play, pause, skipToNext, skipToPrevious } from '../spotify/spotifyApi'

export function useMediaSessionSync() {
  const { trackName, artistName, albumName, albumImage, isPlaying } = usePlayerStore()

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackName || 'Cybertify',
        artist: artistName || 'Awaiting Signal',
        album: albumName || 'Unknown Album',
        artwork: albumImage ? [{ src: albumImage, sizes: '300x300', type: 'image/jpeg' }] : []
      })

      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
      } catch (e) {
        // Some older browsers might not support setting playbackState
      }
    }
  }, [trackName, artistName, albumName, albumImage, isPlaying])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const handleAction = async (actionFn: (token: string) => Promise<void>) => {
      const token = await getValidAccessToken(spotifyConfig)
      if (token) {
        await actionFn(token)
      }
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => handleAction(play))
      navigator.mediaSession.setActionHandler('pause', () => handleAction(pause))
      navigator.mediaSession.setActionHandler('previoustrack', () => handleAction(skipToPrevious))
      navigator.mediaSession.setActionHandler('nexttrack', () => handleAction(skipToNext))
    } catch (e) {
      console.error('MediaSession Action handlers not supported', e)
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
      } catch (e) {}
    }
  }, [])
}
