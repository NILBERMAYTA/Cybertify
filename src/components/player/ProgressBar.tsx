import { memo } from 'react'

type ProgressBarProps = {
  progressMs?: number
  durationMs?: number
  onSeek?: (positionMs: number) => void
}

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function ProgressBarComponent({ progressMs = 0, durationMs = 1, onSeek }: ProgressBarProps) {
  const progress = Math.min(100, Math.max(0, (progressMs / durationMs) * 100))

  return (
    <div className="space-y-1 text-xs text-[#999]">
      <button
        className="h-3 w-full border border-[#444] bg-[#222] text-left"
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          const ratio = (event.clientX - bounds.left) / bounds.width
          onSeek?.(Math.max(0, Math.min(durationMs, ratio * durationMs)))
        }}
        type="button"
      >
        <div className="h-full bg-[#888]" style={{ width: `${progress}%` }} />
      </button>
      <div className="flex justify-between">
        <span>{formatMs(progressMs)}</span>
        <span>{formatMs(durationMs)}</span>
      </div>
    </div>
  )
}

export const ProgressBar = memo(ProgressBarComponent)
