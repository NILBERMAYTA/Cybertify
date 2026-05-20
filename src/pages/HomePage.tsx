import { memo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { spotifyConfig } from '../app/config'
import { paths } from '../app/paths'
import { TerminalPanel } from '../components/layout/TerminalPanel'
import { TerminalShell } from '../components/layout/TerminalShell'
import { NowPlayingSummary } from '../components/home/NowPlayingSummary'
import { TrackSearchPanel } from '../components/home/TrackSearchPanel'
import { SpotifyProfilePanel } from '../components/profile/SpotifyProfilePanel'
import { getValidAccessToken } from '../features/auth/spotifyAuth'
import { usePlayerStore } from '../features/player/playerStore'
import { getCurrentlyPlaying } from '../features/spotify/spotifyApi'
import { useThemeStore } from '../features/theme/themeStore'

function HomePageComponent() {
  const lastAlbumImageRef = useRef('')

  useEffect(() => {
    const controller = new AbortController()
    const setCurrentlyPlaying = usePlayerStore.getState().setCurrentlyPlaying
    const setThemeFromAlbum = useThemeStore.getState().setThemeFromAlbum

    async function syncCurrentlyPlaying() {
      const accessToken = await getValidAccessToken(spotifyConfig)

      if (!accessToken || controller.signal.aborted) {
        return
      }

      try {
        const currentlyPlaying = await getCurrentlyPlaying(accessToken, controller.signal)
        setCurrentlyPlaying(currentlyPlaying)

        const albumImage = currentlyPlaying?.item?.album.images[0]?.url ?? ''

        if (albumImage && albumImage !== lastAlbumImageRef.current) {
          lastAlbumImageRef.current = albumImage
          await setThemeFromAlbum(albumImage)
        }
      } catch {
        // Polling should be non-blocking for the home view.
      }
    }

    void syncCurrentlyPlaying()
    const intervalId = window.setInterval(() => void syncCurrentlyPlaying(), 2000)

    return () => {
      window.clearInterval(intervalId)
      controller.abort()
    }
  }, [])

  return (
    <TerminalShell contentClassName="mx-auto grid w-full max-w-6xl content-center gap-4 px-4 py-12">
      <header className="terminal-frame flex items-center justify-between px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyber-pink">
        <span>* CYBERTIFY *</span>
        <Link className="text-cyber-muted hover:text-cyber-cyan" to={paths.player}>
          player
        </Link>
      </header>
      <TerminalPanel title="auth / profile">
        <SpotifyProfilePanel />
      </TerminalPanel>
      <TerminalPanel title="currently playing">
        <NowPlayingSummary />
      </TerminalPanel>
      <TerminalPanel title="search">
        <TrackSearchPanel />
      </TerminalPanel>
    </TerminalShell>
  )
}

export const HomePage = memo(HomePageComponent)
