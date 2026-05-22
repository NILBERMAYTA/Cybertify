import { memo } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../app/paths'
import { TerminalPanel } from '../components/layout/TerminalPanel'
import { TerminalShell } from '../components/layout/TerminalShell'
import { SpotifyProfilePanel } from '../components/profile/SpotifyProfilePanel'

function HomePageComponent() {
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
    </TerminalShell>
  )
}

export const HomePage = memo(HomePageComponent)
