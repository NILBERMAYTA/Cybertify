import type { ReactNode } from 'react'
import { memo } from 'react'
import { NeonBorder } from './NeonBorder'

type TerminalPanelProps = {
  title?: string
  children: ReactNode
  className?: string
}

function TerminalPanelComponent({ title, children, className = '' }: TerminalPanelProps) {
  return (
    <NeonBorder className={className}>
      <section className="terminal-panel bg-black/45">
        {title ? (
          <header className="border-b border-cyber-cyan/20 px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-cyber-cyan">
            {title}
          </header>
        ) : null}
        <div className="p-4">{children}</div>
      </section>
    </NeonBorder>
  )
}

export const TerminalPanel = memo(TerminalPanelComponent)
