import type { ReactNode } from 'react'
import { memo } from 'react'
import { motion } from 'framer-motion'

type TerminalPanelProps = {
  title?: string
  children: ReactNode
  className?: string
}

function TerminalPanelComponent({ title, children, className = '' }: TerminalPanelProps) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`border bg-[#1a1a1a] min-w-0 flex flex-col ${className}`}
      style={{ 
        borderColor: 'var(--color-dynamic-primary, #00f5ff)',
        boxShadow: '0 0 15px var(--color-dynamic-glow, rgba(0, 245, 255, 0.3)), inset 0 0 15px var(--color-dynamic-glow, rgba(0, 245, 255, 0.3))'
      }}
    >
      {title ? (
        <header 
          className="border-b px-4 py-2 text-xs uppercase tracking-wider text-[#999]"
          style={{ borderColor: 'var(--color-dynamic-primary, #00f5ff)', textShadow: '0 0 5px var(--color-dynamic-primary, #00f5ff)' }}
        >
          {title}
        </header>
      ) : null}
      <div className="p-4 min-w-0 w-full overflow-hidden">{children}</div>
    </motion.section>
  )
}

export const TerminalPanel = memo(TerminalPanelComponent)
