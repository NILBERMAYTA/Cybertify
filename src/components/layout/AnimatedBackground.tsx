import { memo, useEffect, useRef } from 'react'

function AnimatedBackgroundComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    window.addEventListener('resize', resize)
    resize()

    const draw = () => {
      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)
      
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-dynamic-primary').trim() || '#00f5ff'
      
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 1

      // Draw grid
      const gridSize = 40
      const perspectiveOffset = h * 0.4 // Horizon line
      
      // Moving floor effect
      const speed = 0.5
      time = (time + speed) % gridSize

      ctx.beginPath()
      
      // Horizontal lines with perspective
      for (let y = perspectiveOffset; y <= h + gridSize; y += gridSize) {
        const moveY = perspectiveOffset + Math.pow(((y + time) - perspectiveOffset) / (h - perspectiveOffset), 1.5) * (h - perspectiveOffset)
        
        if (moveY <= h && moveY >= perspectiveOffset) {
          ctx.moveTo(0, moveY)
          ctx.lineTo(w, moveY)
        }
      }

      // Vertical lines radiating from center horizon
      const centerX = w / 2
      for (let x = -w; x <= w * 2; x += gridSize * 2) {
        ctx.moveTo(centerX, perspectiveOffset)
        ctx.lineTo(x, h)
      }

      ctx.stroke()
      ctx.globalAlpha = 1
      
      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  )
}

export const AnimatedBackground = memo(AnimatedBackgroundComponent)
