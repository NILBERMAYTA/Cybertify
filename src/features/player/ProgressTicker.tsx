import { memo, useEffect } from 'react'
import { usePlayerStore } from './playerStore'

const TICK_MS = 500

function ProgressTickerComponent() {
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      usePlayerStore.getState().tickProgress(TICK_MS)
    }, TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  return null
}

export const ProgressTicker = memo(ProgressTickerComponent)
