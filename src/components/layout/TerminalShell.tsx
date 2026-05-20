import type { ReactNode } from 'react'
import { memo } from 'react'
import { AnimatedBackground } from './AnimatedBackground'
import { NoiseBackground } from './NoiseBackground'
import { ScanlineOverlay } from './ScanlineOverlay'

type TerminalShellProps = {
  children: ReactNode
  contentClassName?: string
}

function TerminalShellComponent({ children, contentClassName = '' }: TerminalShellProps) {
  return (
    <main className="terminal-shell min-h-screen overflow-hidden bg-[#08040a] font-mono text-cyber-ice">
      <AnimatedBackground />
      <ScanlineOverlay />
      <NoiseBackground />
      <div className={`relative z-10 min-h-screen ${contentClassName}`}>{children}</div>
    </main>
  )
}

export const TerminalShell = memo(TerminalShellComponent)
