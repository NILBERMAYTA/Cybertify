/* eslint-disable @typescript-eslint/no-empty-object-type */

// Type declarations for the Spotify Web Playback SDK
// https://developer.spotify.com/documentation/web-playback-sdk/reference

interface Window {
  Spotify: typeof Spotify
  onSpotifyWebPlaybackSDKReady: () => void
}

declare namespace Spotify {
  interface PlayerInit {
    name: string
    getOAuthToken: (cb: (token: string) => void) => void
    volume?: number
  }

  interface WebPlaybackError {
    message: string
  }

  interface WebPlaybackState {
    context: {
      uri: string | null
      metadata: Record<string, string> | null
    }
    disallows: Record<string, boolean>
    paused: boolean
    position: number
    repeat_mode: number
    shuffle: boolean
    track_window: {
      current_track: WebPlaybackTrack
      previous_tracks: WebPlaybackTrack[]
      next_tracks: WebPlaybackTrack[]
    }
  }

  interface WebPlaybackTrack {
    uri: string
    id: string | null
    type: string
    media_type: string
    name: string
    is_playable: boolean
    album: {
      uri: string
      name: string
      images: Array<{ url: string }>
    }
    artists: Array<{
      uri: string
      name: string
    }>
  }

  interface WebPlaybackPlayer {
    device_id: string
  }

  class Player {
    constructor(options: PlayerInit)
    connect(): Promise<boolean>
    disconnect(): void
    addListener(event: 'ready', callback: (data: WebPlaybackPlayer) => void): void
    addListener(event: 'not_ready', callback: (data: WebPlaybackPlayer) => void): void
    addListener(event: 'player_state_changed', callback: (state: WebPlaybackState | null) => void): void
    addListener(event: 'initialization_error', callback: (error: WebPlaybackError) => void): void
    addListener(event: 'authentication_error', callback: (error: WebPlaybackError) => void): void
    addListener(event: 'account_error', callback: (error: WebPlaybackError) => void): void
    addListener(event: 'playback_error', callback: (error: WebPlaybackError) => void): void
    removeListener(event: string): void
    getCurrentState(): Promise<WebPlaybackState | null>
    setName(name: string): Promise<void>
    getVolume(): Promise<number>
    setVolume(volume: number): Promise<void>
    pause(): Promise<void>
    resume(): Promise<void>
    togglePlay(): Promise<void>
    seek(positionMs: number): Promise<void>
    previousTrack(): Promise<void>
    nextTrack(): Promise<void>
    activateElement(): Promise<void>
  }
}
