import { memo } from 'react'

function ScanlineOverlayComponent() {
  return <div className="scanline-overlay pointer-events-none fixed inset-0 z-20" aria-hidden="true" />
}

export const ScanlineOverlay = memo(ScanlineOverlayComponent)
