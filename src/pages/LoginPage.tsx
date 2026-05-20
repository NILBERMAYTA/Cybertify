import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { spotifyConfig, isSpotifyConfigured } from '../app/config'
import { GlitchText } from '../components/layout/GlitchText'
import { TerminalPanel } from '../components/layout/TerminalPanel'
import { TerminalShell } from '../components/layout/TerminalShell'
import { redirectToSpotifyLogin } from '../features/auth/spotifyAuth'

export function LoginPage() {
  const handleSpotifyLogin = useCallback(async () => {
    if (!isSpotifyConfigured()) {
      window.alert('Configura VITE_SPOTIFY_CLIENT_ID en .env antes de iniciar sesion con Spotify.')
      return
    }

    await redirectToSpotifyLogin(spotifyConfig)
  }, [])

  return (
    <TerminalShell contentClassName="flex items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-5xl"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <TerminalPanel className="font-mono">
          <h1 className="text-5xl font-black uppercase leading-none text-white sm:text-7xl">
            <GlitchText>CYBERTIFY</GlitchText>
          </h1>
          <p className="mt-5 text-base uppercase tracking-[0.22em] text-cyber-muted">
            Retro Futuristic Spotify Interface
          </p>
          <button className="terminal-button terminal-button-primary mt-8" type="button" onClick={handleSpotifyLogin}>
            Connect with Spotify
          </button>
        </TerminalPanel>
      </motion.div>
    </TerminalShell>
  )
}
