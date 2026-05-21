import { memo, useEffect } from 'react'
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

function HomePageComponent() {
  useEffect(() => {
    const controller = new AbortController()
    const setCurrentlyPlaying = usePlayerStore.getState().setCurrentlyPlaying

    async function syncCurrentlyPlaying() {
      const accessToken = await getValidAccessToken(spotifyConfig)

      if (!accessToken || controller.signal.aborted) {
        return
      }

      try {
        const currentlyPlaying = await getCurrentlyPlaying(accessToken, controller.signal)
        setCurrentlyPlaying(currentlyPlaying)
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
      <header className="flex items-center justify-between border border-[#333] bg-[#1a1a1a] px-4 py-2 text-xs uppercase tracking-wider text-[#999]">
        <span>CYBERTIFY</span>
        <Link className="text-[#999] hover:text-white" to={paths.player}>
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
