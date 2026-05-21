import type { ReactNode } from 'react'
import { memo } from 'react'

type TerminalPanelProps = {
  title?: string
  children: ReactNode
  className?: string
}

function TerminalPanelComponent({ title, children, className = '' }: TerminalPanelProps) {
  return (
    <section className={`border border-[#333] bg-[#1a1a1a] ${className}`}>
      {title ? (
        <header className="border-b border-[#333] px-4 py-2 text-xs uppercase tracking-wider text-[#999]">
          {title}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

export const TerminalPanel = memo(TerminalPanelComponent)
