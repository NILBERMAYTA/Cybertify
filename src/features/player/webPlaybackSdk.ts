import { getValidAccessToken } from '../auth/spotifyAuth'
import { transferPlayback } from '../spotify/spotifyApi'
import { spotifyConfig } from '../../app/config'

const PLAYER_NAME = 'Cybertify Web Player'
const INITIAL_VOLUME = 0.5

type WebPlayerState = {
  player: Spotify.Player | null
  deviceId: string | null
  ready: boolean
  error: string | null
}

let state: WebPlayerState = {
  player: null,
  deviceId: null,
  ready: false,
  error: null,
}

let listeners: Array<(state: WebPlayerState) => void> = []

function notify() {
  for (const listener of listeners) {
    listener(state)
  }
}

export function subscribeWebPlayer(listener: (state: WebPlayerState) => void) {
  listeners.push(listener)
  listener(state) // send current state immediately
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function getWebPlayerState() {
  return state
}

export function getWebPlayerDeviceId() {
  return state.deviceId
}

function updateState(partial: Partial<WebPlayerState>) {
  state = { ...state, ...partial }
  notify()
}

async function getToken(): Promise<string> {
  const token = await getValidAccessToken(spotifyConfig)
  return token ?? ''
}

/**
 * Initialize the Spotify Web Playback SDK.
 * Call this once after the user is authenticated.
 * The SDK script must already be loaded (via index.html).
 */
export function initWebPlayer(): Promise<void> {
  return new Promise((resolve) => {
    // If SDK is already loaded, initialize immediately
    if (window.Spotify?.Player) {
      createPlayer()
      resolve()
      return
    }

    // Otherwise wait for the SDK to load
    window.onSpotifyWebPlaybackSDKReady = () => {
      createPlayer()
      resolve()
    }
  })
}

function createPlayer() {
  if (state.player) {
    state.player.disconnect()
  }

  const player = new window.Spotify.Player({
    name: PLAYER_NAME,
    getOAuthToken: (cb) => {
      void getToken().then(cb)
    },
    volume: INITIAL_VOLUME,
  })

  // Error listeners
  player.addListener('initialization_error', ({ message }) => {
    console.error('[Cybertify] SDK init error:', message)
    updateState({ error: `Init error: ${message}` })
  })

  player.addListener('authentication_error', ({ message }) => {
    console.error('[Cybertify] SDK auth error:', message)
    updateState({ error: `Auth error: ${message}. Re-login required.` })
  })

  player.addListener('account_error', ({ message }) => {
    console.error('[Cybertify] SDK account error:', message)
    updateState({ error: `Account error: ${message}. Spotify Premium required.` })
  })

  player.addListener('playback_error', ({ message }) => {
    console.error('[Cybertify] SDK playback error:', message)
    updateState({ error: `Playback error: ${message}` })
  })

  // Ready
  player.addListener('ready', ({ device_id }) => {
    console.log('[Cybertify] Web Player ready. Device ID:', device_id)
    updateState({ deviceId: device_id, ready: true, error: null })
    // Auto-transfer playback to this browser device
    void autoTransferPlayback(device_id)
  })

  // Not ready
  player.addListener('not_ready', ({ device_id }) => {
    console.log('[Cybertify] Web Player not ready. Device ID:', device_id)
    updateState({ ready: false })
  })

  // Connect
  void player.connect().then((success) => {
    if (success) {
      console.log('[Cybertify] Web Playback SDK connected')
    } else {
      console.error('[Cybertify] Web Playback SDK failed to connect')
      updateState({ error: 'Failed to connect SDK' })
    }
  })

  updateState({ player, error: null })
}

async function autoTransferPlayback(deviceId: string) {
  try {
    const token = await getToken()
    if (!token) return

    // Transfer playback but don't force play (keep current state)
    await transferPlayback(token, deviceId, false)
    console.log('[Cybertify] Playback transferred to browser')
  } catch (error) {
    // Don't treat this as fatal — user can manually select the device
    console.warn('[Cybertify] Auto-transfer failed (non-fatal):', error)
  }
}

export function disconnectWebPlayer() {
  if (state.player) {
    state.player.disconnect()
    updateState({ player: null, deviceId: null, ready: false, error: null })
  }
}

/**
 * Initializes the web player if needed and waits for it to become ready,
 * returning the device ID.
 */
export function ensureWebPlayerReady(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (state.ready && state.deviceId) {
      resolve(state.deviceId)
      return
    }

    if (state.error) {
      reject(new Error(state.error))
      return
    }

    const unsubscribe = subscribeWebPlayer((newState) => {
      if (newState.ready && newState.deviceId) {
        unsubscribe()
        resolve(newState.deviceId)
      } else if (newState.error) {
        unsubscribe()
        reject(new Error(newState.error))
      }
    })

    if (!state.player) {
      void initWebPlayer()
    }
  })
}
