import { Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { ProgressTicker } from '../features/player/ProgressTicker'
import { RouteFallback } from './RouteFallback'
import { routes } from './routes'
import { ScanlineOverlay } from '../components/layout/ScanlineOverlay'
import { AnimatedBackground } from '../components/layout/AnimatedBackground'
import { useMediaSessionSync } from '../features/player/useMediaSessionSync'

function App() {
  const routeElements = useRoutes(routes)
  useMediaSessionSync()

  return (
    <>
      <ProgressTicker />
      <AnimatedBackground />
      <ScanlineOverlay />
      <Suspense fallback={<RouteFallback />}>{routeElements}</Suspense>
    </>
  )
}

export default App
