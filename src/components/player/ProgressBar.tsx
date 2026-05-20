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
    <div className="space-y-2 font-mono text-xs text-cyber-muted">
      <button
        className="h-3 w-full border border-cyber-cyan/30 bg-black text-left"
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          const ratio = (event.clientX - bounds.left) / bounds.width
          onSeek?.(Math.max(0, Math.min(durationMs, ratio * durationMs)))
        }}
        type="button"
      >
        <div className="h-full bg-cyber-cyan shadow-[0_0_18px_rgba(0,245,255,0.65)]" style={{ width: `${progress}%` }} />
      </button>
      <div className="flex justify-between">
        <span>{formatMs(progressMs)}</span>
        <span>{formatMs(durationMs)}</span>
      </div>
    </div>
  )
}

export const ProgressBar = memo(ProgressBarComponent)
