import type { ReactNode } from 'react'
import { memo } from 'react'

type NeonBorderProps = {
  children: ReactNode
  className?: string
}

function NeonBorderComponent({ children, className = '' }: NeonBorderProps) {
  return <div className={`neon-border ${className}`}>{children}</div>
}

export const NeonBorder = memo(NeonBorderComponent)
