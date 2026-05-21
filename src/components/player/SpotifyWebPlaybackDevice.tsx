import { memo, useEffect } from 'react'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'

const SPOTIFY_SDK_URL = 'https://sdk.scdn.co/spotify-player.js'

let sdkPromise: Promise<void> | null = null

function loadSpotifyPlaybackSdk() {
  if (window.Spotify) {
    return Promise.resolve()
  }

  if (sdkPromise) {
    return sdkPromise
  }

  sdkPromise = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve()

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${SPOTIFY_SDK_URL}"]`)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Could not load Spotify Web Playback SDK.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.src = SPOTIFY_SDK_URL
    script.onerror = () => reject(new Error('Could not load Spotify Web Playback SDK.'))
    document.body.appendChild(script)
  })

  return sdkPromise
}

function SpotifyWebPlaybackDeviceComponent() {
  const setDeviceId = usePlayerStore((state) => state.setDeviceId)
  const setWebPlaybackDeviceId = usePlayerStore((state) => state.setWebPlaybackDeviceId)
  const setWebPlaybackStatus = usePlayerStore((state) => state.setWebPlaybackStatus)

  useEffect(() => {
    let player: SpotifyWebPlaybackPlayer | null = null
    let disposed = false

    async function connectPlayer() {
      const accessToken = await getValidAccessToken(spotifyConfig)

      if (!accessToken) {
        setWebPlaybackStatus('web playback waiting for login')
        return
      }

      try {
        await loadSpotifyPlaybackSdk()
      } catch (error) {
        setWebPlaybackStatus(error instanceof Error ? error.message : 'sdk load failed')
        return
      }

      if (disposed || !window.Spotify) {
        return
      }

      player = new window.Spotify.Player({
        name: 'Cybertify Web Player',
        getOAuthToken: (callback) => {
          void getValidAccessToken(spotifyConfig).then((token) => {
            if (token) {
              callback(token)
            }
          })
        },
        volume: 0.65,
      })

      player.addListener('ready', (event) => {
        const readyEvent = event as SpotifyWebPlaybackReadyEvent
        setDeviceId(readyEvent.device_id)
        setWebPlaybackDeviceId(readyEvent.device_id)
        setWebPlaybackStatus('web device ready')
      })

      player.addListener('not_ready', () => {
        setWebPlaybackStatus('web device offline')
      })

      for (const eventName of ['initialization_error', 'authentication_error', 'account_error', 'playback_error']) {
        player.addListener(eventName, (event) => {
          const error = event as SpotifyWebPlaybackError
          setWebPlaybackStatus(error.message)
        })
      }

      const connected = await player.connect()
      setWebPlaybackStatus(connected ? 'web playback connected' : 'web playback connection failed')
    }

    void connectPlayer()

    return () => {
      disposed = true
      setWebPlaybackDeviceId(null)
      player?.disconnect()
    }
  }, [setDeviceId, setWebPlaybackDeviceId, setWebPlaybackStatus])

  return null
}

export const SpotifyWebPlaybackDevice = memo(SpotifyWebPlaybackDeviceComponent)
