import { memo, useEffect, useRef } from 'react'

type AudioVisualizerProps = {
  isPlaying?: boolean
  progressMs?: number
}

const BAR_COUNT = 48
const IDLE_LEVEL = 0.06

function AudioVisualizerComponent({ isPlaying = false, progressMs = 0 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const levelsRef = useRef(Array.from({ length: BAR_COUNT }, () => IDLE_LEVEL))
  const isPlayingRef = useRef(isPlaying)
  const progressMsRef = useRef(progressMs)

  useEffect(() => {
    isPlayingRef.current = isPlaying
    progressMsRef.current = progressMs
  }, [isPlaying, progressMs])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resizeCanvas() {
      const rect = canvas!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas!.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas!.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(canvas)
    resizeCanvas()

    function draw(time: number) {
      const w = canvas!.clientWidth
      const h = canvas!.clientHeight
      const gap = 3
      const barW = Math.max(2, (w - gap * (BAR_COUNT - 1)) / BAR_COUNT)
      const levels = levelsRef.current

      ctx!.clearRect(0, 0, w, h)

      for (let i = 0; i < BAR_COUNT; i++) {
        // Generate pseudo-random but deterministic bar heights from sin waves
        const wave1 = Math.sin(time * 0.003 + i * 0.6 + progressMsRef.current * 0.0008)
        const wave2 = Math.sin(time * 0.005 + i * 0.35)
        const wave3 = Math.sin(time * 0.002 + i * 1.1 + progressMsRef.current * 0.0012)
        const bass = i < BAR_COUNT * 0.3 ? 0.15 : 0
        const target = isPlayingRef.current
          ? 0.15 + Math.abs(wave1 * 0.35) + Math.abs(wave2 * 0.25) + Math.abs(wave3 * 0.15) + bass
          : IDLE_LEVEL

        // Smooth interpolation toward target
        levels[i] += (Math.min(0.95, target) - levels[i]) * 0.1

        const barH = Math.max(2, levels[i] * (h - 4))
        const x = i * (barW + gap)
        const y = h - barH

        const baseColor = document.documentElement.style.getPropertyValue('--color-dynamic-primary') || '#00f5ff'
        ctx!.fillStyle = baseColor
        ctx!.globalAlpha = Math.min(1, 0.3 + levels[i] * 0.7)
        ctx!.fillRect(x, y, barW, barH)
        ctx!.globalAlpha = 1
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)

    return () => {
      observer.disconnect()
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return (
    <canvas
      className="block h-full w-full"
      ref={canvasRef}
      aria-label="Audio visualizer"
    />
  )
}

export const AudioVisualizer = memo(AudioVisualizerComponent)
