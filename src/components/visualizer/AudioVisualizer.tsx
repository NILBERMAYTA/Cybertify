import { memo, useEffect, useRef } from 'react'
import { useThemeStore } from '../../features/theme/themeStore'

type AudioVisualizerProps = {
  isPlaying?: boolean
  progressMs?: number
}

const BAR_COUNT = 48
const IDLE_LEVEL = 0.18

function AudioVisualizerComponent({ isPlaying = false, progressMs = 0 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const levelsRef = useRef(Array.from({ length: BAR_COUNT }, () => IDLE_LEVEL))
  const isPlayingRef = useRef(isPlaying)
  const progressMsRef = useRef(progressMs)
  const primaryColor = useThemeStore((state) => state.primaryColor)
  const secondaryColor = useThemeStore((state) => state.secondaryColor)
  const backgroundColor = useThemeStore((state) => state.backgroundColor)
  const glowColor = useThemeStore((state) => state.glowColor)

  useEffect(() => {
    isPlayingRef.current = isPlaying
    progressMsRef.current = progressMs
  }, [isPlaying, progressMs])

  useEffect(() => {
    const canvasElement = canvasRef.current

    if (!canvasElement) {
      return
    }

    const canvasContext = canvasElement.getContext('2d')

    if (!canvasContext) {
      return
    }

    const canvas = canvasElement
    const context = canvasContext

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio))
      canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio))
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(canvas)
    resizeCanvas()

    function draw(time: number) {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const gap = 4
      const barWidth = Math.max(3, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT)
      const levels = levelsRef.current

      context.clearRect(0, 0, width, height)
      context.fillStyle = backgroundColor
      context.globalAlpha = 0.32
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1

      const gradient = context.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, primaryColor)
      gradient.addColorStop(1, secondaryColor)
      context.fillStyle = gradient
      context.shadowColor = glowColor
      context.shadowBlur = 16

      for (let index = 0; index < BAR_COUNT; index += 1) {
        const wave = Math.sin(time * 0.004 + index * 0.55 + progressMsRef.current * 0.001)
        const pulse = Math.sin(time * 0.0025 + index * 0.21)
        const target = isPlayingRef.current ? 0.22 + Math.abs(wave * 0.48) + Math.abs(pulse * 0.22) : IDLE_LEVEL
        levels[index] += (Math.min(0.95, target) - levels[index]) * 0.12

        const barHeight = Math.max(6, levels[index] * (height - 18))
        const x = index * (barWidth + gap)
        const y = height - barHeight

        context.fillRect(x, y, barWidth, barHeight)
      }

      context.shadowBlur = 0
      frameRef.current = window.requestAnimationFrame(draw)
    }

    frameRef.current = window.requestAnimationFrame(draw)

    return () => {
      resizeObserver.disconnect()

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [backgroundColor, glowColor, primaryColor, secondaryColor])

  return (
    <div className="h-48 border border-cyber-pink/25 bg-cyber-panel/60 p-3">
      <canvas className="h-full w-full" ref={canvasRef} aria-label="Audio visualizer" />
    </div>
  )
}

export const AudioVisualizer = memo(AudioVisualizerComponent)
