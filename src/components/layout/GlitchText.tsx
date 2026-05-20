type GlitchTextProps = {
  children: string
  className?: string
}

export function GlitchText({ children, className = '' }: GlitchTextProps) {
  return (
    <span className={`glitch-text ${className}`} data-text={children}>
      {children}
    </span>
  )
}
