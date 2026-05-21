import { create } from 'zustand'
import type { SpotifyCurrentlyPlaying } from '../spotify/spotifyTypes'
import type { SpotifyPlaybackState } from '../spotify/spotifyTypes'
import type { SpotifyTrack } from '../spotify/spotifyTypes'

type PlayerState = {
  currentTrack: SpotifyTrack | null
  isPlaying: boolean
  progressMs: number
  durationMs: number
  albumImage: string
  albumName: string
  artistName: string
  trackName: string
  activeDeviceId: string | null
  deviceId: string | null
  webPlaybackDeviceId: string | null
  pendingTrackUri: string | null
  webPlaybackStatus: string
  setCurrentTrack: (track: SpotifyTrack | null) => void
  setCurrentlyPlaying: (currentlyPlaying: SpotifyCurrentlyPlaying | null) => void
  setActiveDeviceId: (deviceId: string | null) => void
  setDeviceId: (deviceId: string | null) => void
  setPendingTrackUri: (trackUri: string | null) => void
  setPlaybackState: (playback: SpotifyPlaybackState | null) => void
  setWebPlaybackDeviceId: (deviceId: string | null) => void
  setWebPlaybackStatus: (status: string) => void
  tickProgress: (deltaMs: number) => void
}

function getTrackMetadata(track: SpotifyTrack | null) {
  return {
    albumImage: track?.album.images[0]?.url ?? '',
    albumName: track?.album.name ?? '',
    artistName: track?.artists.map((artist) => artist.name).join(', ') ?? '',
    durationMs: track?.duration_ms ?? 0,
    trackName: track?.name ?? '',
  }
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  progressMs: 0,
  durationMs: 0,
  albumImage: '',
  albumName: '',
  artistName: '',
  activeDeviceId: null,
  trackName: '',
  deviceId: null,
  webPlaybackDeviceId: null,
  pendingTrackUri: null,
  webPlaybackStatus: 'web playback idle',
  setCurrentTrack: (track) =>
    set({
      currentTrack: track,
      ...getTrackMetadata(track),
    }),
  setCurrentlyPlaying: (currentlyPlaying) =>
    set({
      currentTrack: currentlyPlaying?.item ?? null,
      isPlaying: currentlyPlaying?.is_playing ?? false,
      progressMs: currentlyPlaying?.progress_ms ?? 0,
      ...getTrackMetadata(currentlyPlaying?.item ?? null),
    }),
  setActiveDeviceId: (activeDeviceId) => set({ activeDeviceId }),
  setDeviceId: (deviceId) => set({ deviceId }),
  setPendingTrackUri: (pendingTrackUri) => set({ pendingTrackUri }),
  setPlaybackState: (playback) =>
    set({
      activeDeviceId: playback?.device?.id ?? null,
      currentTrack: playback?.item ?? null,
      isPlaying: playback?.is_playing ?? false,
      progressMs: playback?.progress_ms ?? 0,
      ...getTrackMetadata(playback?.item ?? null),
    }),
  setWebPlaybackDeviceId: (webPlaybackDeviceId) => set({ webPlaybackDeviceId }),
  setWebPlaybackStatus: (webPlaybackStatus) => set({ webPlaybackStatus }),
  tickProgress: (deltaMs) =>
    set((state) => {
      if (!state.isPlaying || !state.currentTrack) {
        return state
      }

      return {
        progressMs: Math.min(state.durationMs, state.progressMs + deltaMs),
      }
    }),
}))
