import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spotifyConfig } from '../../app/config'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { usePlayerStore } from '../../features/player/playerStore'
import {
  getAvailableDevices,
  transferPlayback,
  SpotifyApiError,
} from '../../features/spotify/spotifyApi'
import type { SpotifyDevice } from '../../features/spotify/spotifyTypes'

// ── SVG Icons ────────────────────────────────────────────────────────

function DeviceIcon({ type, size = 16 }: { type: string; size?: number }) {
  const t = type.toLowerCase()

  if (t === 'computer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  }

  if (t === 'smartphone') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    )
  }

  if (t === 'speaker') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="14" r="4" />
        <line x1="12" y1="6" x2="12.01" y2="6" />
      </svg>
    )
  }

  if (t === 'tv') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="15" rx="2" />
        <polyline points="17 2 12 7 7 2" />
      </svg>
    )
  }

  if (t === 'castaudio' || t === 'castvideo') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
        <line x1="2" y1="20" x2="2.01" y2="20" />
      </svg>
    )
  }

  // Generic / fallback
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function RefreshIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function VolumeIcon({ level, size = 14 }: { level: number | null; size?: number }) {
  if (level === null || level === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {level > 30 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
      {level > 65 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────

type DeviceSelectorProps = {
  onTransfer?: () => void
}

function DeviceSelectorComponent({ onTransfer }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const activeStoreDevice = usePlayerStore((state) => state.activeDevice)
  
  // Prefer the freshly fetched active device from the dropdown, but default to the store's auto-polled active device
  const activeDevice = devices.find((d) => d.is_active) ?? activeStoreDevice

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchDevices = useCallback(async () => {
    const accessToken = await getValidAccessToken(spotifyConfig)
    if (!accessToken) {
      setError('Login required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await getAvailableDevices(accessToken)
      setDevices(response.devices)
      if (response.devices.length === 0) {
        setError('No devices found')
      }
    } catch (err) {
      if (err instanceof SpotifyApiError && err.status === 429) {
        setError(`Rate limit. Wait ${err.retryAfterSeconds ?? 15}s`)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load devices')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleTransfer = useCallback(async (device: SpotifyDevice) => {
    if (!device.id || device.is_active) return

    const accessToken = await getValidAccessToken(spotifyConfig)
    if (!accessToken) return

    setLoading(true)
    setError('')

    try {
      await transferPlayback(accessToken, device.id)
      setIsOpen(false)
      onTransfer?.()
      // Refresh device list after a short delay for the transfer to take effect
      window.setTimeout(() => void fetchDevices(), 1500)
    } catch (err) {
      if (err instanceof SpotifyApiError && err.status === 429) {
        setError(`Rate limit. Wait ${err.retryAfterSeconds ?? 15}s`)
      } else if (err instanceof SpotifyApiError && err.status === 404) {
        setError('Device not available')
      } else {
        setError(err instanceof Error ? err.message : 'Transfer failed')
      }
    } finally {
      setLoading(false)
    }
  }, [fetchDevices, onTransfer])

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      void fetchDevices()
    }
    setIsOpen((prev) => !prev)
  }, [fetchDevices, isOpen])

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger button */}
      <motion.button
        className="flex w-full items-center gap-2 border border-[#333] bg-[#1a1a1a] px-3 py-2 text-left text-[11px] uppercase tracking-wider text-[#999]"
        onClick={handleToggle}
        type="button"
        whileHover={{ borderColor: '#555' }}
        transition={{ duration: 0.15 }}
      >
        {activeDevice ? (
          <>
            <span style={{ color: 'var(--color-dynamic-primary, #00f5ff)' }}>
              <DeviceIcon type={activeDevice.type} size={14} />
            </span>
            <span className="flex-1 truncate">{activeDevice.name}</span>
            <VolumeIcon level={activeDevice.volume_percent} size={12} />
            {activeDevice.volume_percent !== null && (
              <span className="text-[10px] text-[#666]">{activeDevice.volume_percent}%</span>
            )}
          </>
        ) : (
          <>
            <span className="text-[#555]">
              <DeviceIcon type="generic" size={14} />
            </span>
            <span className="flex-1 text-[#666]">No active device</span>
          </>
        )}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[#666]"
        >
          <ChevronDownIcon size={12} />
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden border border-[#333] bg-[#121212] shadow-2xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {/* Header with refresh */}
            <div className="flex items-center justify-between border-b border-[#2a2a2a] px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[#555]">
                Devices ({devices.length})
              </span>
              <motion.button
                className="text-[#555] hover:text-[#999]"
                onClick={() => void fetchDevices()}
                disabled={loading}
                type="button"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                title="Refresh devices"
              >
                <RefreshIcon />
              </motion.button>
            </div>

            {/* Loading state */}
            {loading && devices.length === 0 && (
              <div className="px-3 py-3 text-center text-[10px] text-[#555]">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Scanning devices...
                </motion.span>
              </div>
            )}

            {/* Device list */}
            {devices.map((device) => (
              <motion.button
                key={device.id ?? device.name}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] ${
                  device.is_active
                    ? 'bg-[#1a1a1a]'
                    : 'hover:bg-[#1a1a1a]'
                } ${device.is_restricted ? 'opacity-40' : ''}`}
                disabled={device.is_active || device.is_restricted || !device.id || loading}
                onClick={() => void handleTransfer(device)}
                type="button"
                whileHover={device.is_active || device.is_restricted ? undefined : { x: 4 }}
                transition={{ duration: 0.15 }}
              >
                <span
                  className={device.is_active ? '' : 'text-[#666]'}
                  style={device.is_active ? { color: 'var(--color-dynamic-primary, #00f5ff)' } : undefined}
                >
                  <DeviceIcon type={device.type} size={16} />
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className={`block truncate ${device.is_active ? 'text-white' : 'text-[#ccc]'}`}
                    style={device.is_active ? { color: 'var(--color-dynamic-primary, #00f5ff)' } : undefined}
                  >
                    {device.name}
                  </span>
                  <span className="block text-[10px] text-[#555]">
                    {device.type.toLowerCase()}
                    {device.is_active ? ' / active' : ''}
                    {device.is_restricted ? ' / restricted' : ''}
                  </span>
                </span>
                {device.volume_percent !== null && (
                  <span className="flex items-center gap-1 text-[#555]">
                    <VolumeIcon level={device.volume_percent} size={12} />
                    <span className="text-[10px]">{device.volume_percent}%</span>
                  </span>
                )}
                {device.is_active && (
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-dynamic-primary, #00f5ff)' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>
            ))}

            {/* Empty state */}
            {!loading && devices.length === 0 && (
              <div className="px-3 py-3 text-center text-[10px] text-[#555]">
                No devices found. Open Spotify on a device.
              </div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  className="border-t border-[#2a2a2a] px-3 py-1.5 text-center text-[10px] text-red-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const DeviceSelector = memo(DeviceSelectorComponent)
