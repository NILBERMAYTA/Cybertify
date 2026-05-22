import { memo, useEffect, useRef } from 'react'

type AudioVisualizerProps = {
  isPlaying?: boolean
  progressMs?: number
  albumImage?: string
}

const BAR_COUNT = 48
const IDLE_LEVEL = 0.06

function AudioVisualizerComponent({ isPlaying = false, progressMs = 0, albumImage = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const levelsRef = useRef(Array.from({ length: BAR_COUNT }, () => IDLE_LEVEL))
  const paletteRef = useRef<string[]>(Array.from({ length: BAR_COUNT }, () => ''))
  const isPlayingRef = useRef(isPlaying)
  const progressMsRef = useRef(progressMs)

  useEffect(() => {
    isPlayingRef.current = isPlaying
    progressMsRef.current = progressMs
  }, [isPlaying, progressMs])

  useEffect(() => {
    if (!albumImage) {
      paletteRef.current = Array.from({ length: BAR_COUNT }, () => '')
      return
    }

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = BAR_COUNT
      canvas.height = 1
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(img, 0, 0, BAR_COUNT, 1)
      const data = ctx.getImageData(0, 0, BAR_COUNT, 1).data
      const newPalette: string[] = []

      for (let i = 0; i < BAR_COUNT; i++) {
        const r = data[i * 4]
        const g = data[i * 4 + 1]
        const b = data[i * 4 + 2]
        
        // Boost brightness if colors are too dark
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        let pr = r, pg = g, pb = b
        if (brightness < 40) {
          pr = Math.min(255, r + 50)
          pg = Math.min(255, g + 50)
          pb = Math.min(255, b + 50)
        }
        
        newPalette.push(`rgb(${pr}, ${pg}, ${pb})`)
      }
      
      paletteRef.current = newPalette
    }
    img.src = albumImage
  }, [albumImage])

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

        const fallbackColor = document.documentElement.style.getPropertyValue('--color-dynamic-primary') || '#00f5ff'
        const barColor = paletteRef.current[i] || fallbackColor
        ctx!.fillStyle = barColor
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
