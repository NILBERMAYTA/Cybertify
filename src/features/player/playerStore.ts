import { create } from 'zustand'
import type { SpotifyPlaybackState, SpotifyTrack, SpotifyDevice } from '../spotify/spotifyTypes'

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
  activeDevice: SpotifyDevice | null
  contextUri: string | null
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
  activeDevice: null,
  contextUri: null,
  setCurrentTrack: (track) =>
    set({
      currentTrack: track,
      ...getTrackMetadata(track),
    }),
  setPlaybackState: (playback) =>
    set((state) => {
      const isSameTrack = state.currentTrack?.id === playback?.item?.id
      const serverProgress = playback?.progress_ms ?? 0

      // If we are playing the same track and the server progress is very close
      // to our local progress (e.g. within 3 seconds), we ignore the server's
      // value to prevent the progress bar and lyrics from jumping back and forth
      // due to network latency.
      let nextProgress = serverProgress
      if (isSameTrack && playback?.is_playing) {
        // If the server says we are slightly behind our local ticker (due to network latency),
        // we keep our local ticker to prevent backward jitter.
        // However, if the server says we are AHEAD (or significantly behind), we snap to server to fix desync.
        const diff = serverProgress - state.progressMs
        if (diff < 0 && diff > -1500) {
          nextProgress = state.progressMs
        } else {
          // Add a small 200ms assumed network latency forward compensation
          nextProgress = serverProgress + 200
        }
      }

      return {
        currentTrack: playback?.item ?? null,
        isPlaying: playback?.is_playing ?? false,
        progressMs: nextProgress,
        shuffleState: playback?.shuffle_state ?? false,
        repeatState: playback?.repeat_state ?? 'off',
        volumePercent: playback?.device?.volume_percent ?? 100,
        activeDevice: playback?.device ?? null,
        contextUri: playback?.context?.uri ?? null,
        ...getTrackMetadata(playback?.item ?? null),
      }
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

