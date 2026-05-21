import { Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { SpotifyWebPlaybackDevice } from '../components/player/SpotifyWebPlaybackDevice'
import { ProgressTicker } from '../features/player/ProgressTicker'
import { RouteFallback } from './RouteFallback'
import { routes } from './routes'
import { ScanlineOverlay } from '../components/layout/ScanlineOverlay'

function App() {
  const routeElements = useRoutes(routes)

  return (
    <>
      <SpotifyWebPlaybackDevice />
      <ProgressTicker />
      <ScanlineOverlay />
      <Suspense fallback={<RouteFallback />}>{routeElements}</Suspense>
    </>
  )
}

export default App
