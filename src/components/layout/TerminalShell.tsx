import type { ReactNode } from 'react'
import { memo } from 'react'

type TerminalShellProps = {
  children: ReactNode
  contentClassName?: string
}

function TerminalShellComponent({ children, contentClassName = '' }: TerminalShellProps) {
  return (
    <main className="min-h-screen bg-transparent font-mono text-[#ddd] relative z-10">
      <div className={`min-h-screen ${contentClassName}`}>{children}</div>
    </main>
  )
}

export const TerminalShell = memo(TerminalShellComponent)
