import { memo } from 'react'

function NoiseBackgroundComponent() {
  return <div className="terminal-noise" aria-hidden="true" />
}

export const NoiseBackground = memo(NoiseBackgroundComponent)
