import { create } from 'zustand'
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
  shuffleState: boolean
  repeatState: 'off' | 'context' | 'track'
  volumePercent: number
  setCurrentTrack: (track: SpotifyTrack | null) => void
  setPlaybackState: (playback: SpotifyPlaybackState | null) => void
  tickProgress: (deltaMs: number) => void
  setShuffleState: (shuffle: boolean) => void
  setRepeatState: (repeat: 'off' | 'context' | 'track') => void
  setVolumePercent: (volume: number) => void
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
  trackName: '',
  shuffleState: false,
  repeatState: 'off',
  volumePercent: 100,
  setCurrentTrack: (track) =>
    set({
      currentTrack: track,
      ...getTrackMetadata(track),
    }),
  setPlaybackState: (playback) =>
    set({
      currentTrack: playback?.item ?? null,
      isPlaying: playback?.is_playing ?? false,
      progressMs: playback?.progress_ms ?? 0,
      shuffleState: playback?.shuffle_state ?? false,
      repeatState: playback?.repeat_state ?? 'off',
      volumePercent: playback?.device?.volume_percent ?? 100,
      ...getTrackMetadata(playback?.item ?? null),
    }),
  tickProgress: (deltaMs) =>
    set((state) => {
      if (!state.isPlaying || !state.currentTrack) {
        return state
      }

      return {
        progressMs: Math.min(state.durationMs, state.progressMs + deltaMs),
      }
    }),
  setShuffleState: (shuffle) => set({ shuffleState: shuffle }),
  setRepeatState: (repeat) => set({ repeatState: repeat }),
  setVolumePercent: (volume) => set({ volumePercent: volume }),
}))

