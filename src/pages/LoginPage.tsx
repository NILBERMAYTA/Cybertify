import { useCallback } from 'react'
import { spotifyConfig, isSpotifyConfigured } from '../app/config'
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
      <div className="w-full max-w-5xl">
        <TerminalPanel>
          <h1 className="text-5xl font-bold uppercase text-white">
            CYBERTIFY
          </h1>
          <p className="mt-4 text-sm uppercase tracking-wider text-[#999]">
            Spotify Interface
          </p>
          <button className="terminal-button terminal-button-primary mt-6" type="button" onClick={handleSpotifyLogin}>
            Connect with Spotify
          </button>
        </TerminalPanel>
      </div>
    </TerminalShell>
  )
}
