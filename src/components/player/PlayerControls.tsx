import { memo } from 'react'
import { ProgressBar } from './ProgressBar'

type PlayerControlsProps = {
  durationMs?: number
  onNext?: () => void
  onPlayPause?: () => void
  onPrevious?: () => void
  onSeek?: (positionMs: number) => void
  onVolumeChange?: (volumePercent: number) => void
  progressMs?: number
  isPlaying?: boolean
  volumePercent?: number
}

function PlayerControlsComponent({
  durationMs = 1,
  isPlaying = false,
  onNext,
  onPlayPause,
  onPrevious,
  onSeek,
  onVolumeChange,
  progressMs = 0,
  volumePercent = 50,
}: PlayerControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <button className="terminal-button" type="button" aria-label="Previous track" onClick={onPrevious}>
          PREV
        </button>
        <button className="terminal-button terminal-button-primary" type="button" aria-label="Play or pause" onClick={onPlayPause}>
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <button className="terminal-button" type="button" aria-label="Next track" onClick={onNext}>
          NEXT
        </button>
      </div>

      <ProgressBar progressMs={progressMs} durationMs={durationMs || 1} onSeek={onSeek} />

      <label className="block text-xs uppercase text-[#999]" htmlFor="player-volume">
        Volume {volumePercent}%
      </label>
      <input
        className="w-full"
        id="player-volume"
        max="100"
        min="0"
        onChange={(event) => onVolumeChange?.(Number(event.target.value))}
        type="range"
        value={volumePercent}
      />
    </div>
  )
}

export const PlayerControls = memo(PlayerControlsComponent)
