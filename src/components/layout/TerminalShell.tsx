import type { ReactNode } from 'react'
import { memo } from 'react'

type TerminalShellProps = {
  children: ReactNode
  contentClassName?: string
}

function TerminalShellComponent({ children, contentClassName = '' }: TerminalShellProps) {
  return (
    <main className="min-h-screen bg-[#111] font-mono text-[#ddd]">
      <div className={`min-h-screen ${contentClassName}`}>{children}</div>
    </main>
  )
}

export const TerminalShell = memo(TerminalShellComponent)
