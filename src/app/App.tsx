import { Suspense } from 'react'
import { useRoutes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ProgressTicker } from '../features/player/ProgressTicker'
import { RouteFallback } from './RouteFallback'
import { routes } from './routes'
import { ScanlineOverlay } from '../components/layout/ScanlineOverlay'
import { AnimatedBackground } from '../components/layout/AnimatedBackground'
import { useMediaSessionSync } from '../features/player/useMediaSessionSync'

function App() {
  const location = useLocation()
  const routeElements = useRoutes(routes, location)
  useMediaSessionSync()

  return (
    <div className="relative flex h-screen w-full flex-col bg-[#050505] text-[#ccc] antialiased">
      <ProgressTicker />
      <ScanlineOverlay />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.98, filter: 'brightness(1.5) contrast(1.2) blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'brightness(1) contrast(1) blur(0px)' }}
          exit={{ opacity: 0, scale: 1.02, filter: 'brightness(0.5) contrast(1.2) blur(4px)' }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <Suspense fallback={<RouteFallback />}>{routeElements}</Suspense>
        </motion.div>
      </AnimatePresence>
      <AnimatedBackground />
    </div>
  )
}

export default App
