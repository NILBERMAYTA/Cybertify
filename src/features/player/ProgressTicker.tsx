import { memo, useEffect } from 'react'
import { usePlayerStore } from './playerStore'

const TICK_MS = 100

function ProgressTickerComponent() {
  useEffect(() => {
    let lastTick = Date.now()

    const intervalId = window.setInterval(() => {
      const now = Date.now()
      const deltaMs = now - lastTick
      lastTick = now

      usePlayerStore.getState().tickProgress(deltaMs)
    }, TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  return null
}

export const ProgressTicker = memo(ProgressTickerComponent)
