import { memo } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../app/paths'
import { TerminalPanel } from '../components/layout/TerminalPanel'
import { TerminalShell } from '../components/layout/TerminalShell'
import { SpotifyProfilePanel } from '../components/profile/SpotifyProfilePanel'
import { RecommendedPlaylistsPanel } from '../components/home/RecommendedPlaylistsPanel'
import { CurrentPlayingBar } from '../components/home/CurrentPlayingBar'
import { TrackSearchPanel } from '../components/home/TrackSearchPanel'
import { PlaybackQueue } from '../components/player/PlaybackQueue'

function HomePageComponent() {
  return (
    <TerminalShell contentClassName="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-3 py-3">
      <header 
        className="flex flex-wrap items-start justify-between gap-3 border bg-[#1a1a1a] px-4 py-2 text-xs uppercase tracking-wider text-[#999] transition-all duration-500"
        style={{
          borderColor: 'var(--color-dynamic-primary, #333)',
          boxShadow: '0 0 10px var(--color-dynamic-glow, transparent)'
        }}
      >
        <Link 
          className="shrink-0 py-2 transition-all duration-300 hover:text-[var(--color-dynamic-primary,#00f5ff)] hover:drop-shadow-[0_0_8px_var(--color-dynamic-glow,transparent)]" 
          to={paths.home}
        >
          CYBERTIFY
        </Link>
        <TrackSearchPanel />
        <nav className="flex shrink-0 items-center gap-4 py-2">
          <Link 
            className="whitespace-nowrap transition-all duration-300 hover:text-[var(--color-dynamic-primary,#00f5ff)] hover:drop-shadow-[0_0_8px_var(--color-dynamic-glow,transparent)]" 
            to={paths.player}
          >
            player
          </Link>
        </nav>
      </header>
      
      <div className="grid flex-1 gap-3 lg:grid-cols-[1fr_260px] min-h-0">
        <div className="flex flex-col gap-3 min-w-0 overflow-y-auto pr-1">
          <TerminalPanel title="auth / profile">
            <SpotifyProfilePanel />
          </TerminalPanel>
          <CurrentPlayingBar />
          <TerminalPanel title="recommended playlists">
            <RecommendedPlaylistsPanel />
          </TerminalPanel>
        </div>
        
        <TerminalPanel title="queue" className="hidden lg:block min-h-0 overflow-y-auto">
          <PlaybackQueue />
        </TerminalPanel>
      </div>
    </TerminalShell>
  )
}

export const HomePage = memo(HomePageComponent)
