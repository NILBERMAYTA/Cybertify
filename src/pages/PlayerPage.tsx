import { memo } from 'react'
import { TerminalLayout } from '../components/layout/TerminalLayout'

function PlayerPageComponent() {
  return <TerminalLayout />
}

export const PlayerPage = memo(PlayerPageComponent)
