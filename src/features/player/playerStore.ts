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
  setCurrentTrack: (track: SpotifyTrack | null) => void
  setPlaybackState: (playback: SpotifyPlaybackState | null) => void
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
  trackName: '',
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
}))
