import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { getLyricsFromLrcLib } from '../../features/lyrics/lrclibApi'

type LyricsPanelProps = {
  albumName?: string
  artistName?: string
  durationMs?: number
  lrcText?: string
  progressMs?: number
  trackName?: string
}

type LyricLine = {
  timeMs: number
  text: string
}

const mockLyrics: LyricLine[] = [
  { timeMs: 0, text: 'CYBERTIFY TERMINAL ONLINE' },
  { timeMs: 5000, text: 'Signal locked on neon static' },
  { timeMs: 10000, text: 'Bassline moving through the grid' },
  { timeMs: 15000, text: 'Portals flash in violet rhythm' },
  { timeMs: 20000, text: 'Every pulse becomes a command' },
  { timeMs: 26000, text: 'Synthetic hearts keep time' },
  { timeMs: 32000, text: 'Chrome reflections over midnight' },
  { timeMs: 38000, text: 'Playback status: alive' },
  { timeMs: 44000, text: 'Awaiting lyrics source module' },
  { timeMs: 50000, text: 'LRC parser ready for sync' },
]

function parseTimestamp(timestamp: string) {
  const [minutes = '0', seconds = '0'] = timestamp.split(':')
  const [wholeSeconds = '0', fraction = '0'] = seconds.split('.')

  return Number(minutes) * 60_000 + Number(wholeSeconds) * 1000 + Number(fraction.padEnd(3, '0').slice(0, 3))
}

export function parseLrc(lrcText: string): LyricLine[] {
  return lrcText
    .split('\n')
    .flatMap((line) => {
      const timestamps = Array.from(line.matchAll(/\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]/g))
      const text = line.replace(/\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]/g, '').trim()

      return timestamps.map((match) => ({
        timeMs: parseTimestamp(match[1]),
        text,
      }))
    })
    .filter((line) => line.text)
    .sort((left, right) => left.timeMs - right.timeMs)
}

function plainLyricsToLines(plainLyrics: string): LyricLine[] {
  return plainLyrics
    .split('\n')
    .map((text, index) => ({
      timeMs: index * 4500,
      text: text.trim(),
    }))
    .filter((line) => line.text)
}

function LyricsPanelComponent({ albumName, artistName, durationMs, lrcText, progressMs = 0, trackName }: LyricsPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeLineRef = useRef<HTMLParagraphElement | null>(null)
  const [fetchedLrcText, setFetchedLrcText] = useState<string | null>(null)
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null)
  const [source, setSource] = useState<'lrclib' | 'mock' | 'plain'>('mock')
  const [status, setStatus] = useState('waiting')
  const activeLrcText = fetchedLrcText ?? lrcText ?? null
  const lines = useMemo(() => {
    if (activeLrcText) {
      return parseLrc(activeLrcText)
    }

    if (plainLyrics) {
      return plainLyricsToLines(plainLyrics)
    }

    return mockLyrics
  }, [activeLrcText, plainLyrics])
  const activeIndex = Math.max(
    0,
    lines.findLastIndex((line) => line.timeMs <= progressMs),
  )

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [activeIndex])

  useEffect(() => {
    if (!trackName || !artistName) {
      setFetchedLrcText(null)
      setPlainLyrics(null)
      setSource('mock')
      setStatus('waiting')
      return
    }

    const controller = new AbortController()
    const queryArtistName = artistName
    const queryTrackName = trackName

    async function loadLyrics() {
      setStatus('fetching')

      try {
        const lyrics = await getLyricsFromLrcLib(
          {
            albumName,
            artistName: queryArtistName,
            durationMs,
            trackName: queryTrackName,
          },
          controller.signal,
        )

        if (controller.signal.aborted) {
          return
        }

        if (!lyrics) {
          setFetchedLrcText(null)
          setPlainLyrics(null)
          setSource('mock')
          setStatus('not found')
          return
        }

        if (lyrics.syncedLyrics) {
          setFetchedLrcText(lyrics.syncedLyrics)
          setPlainLyrics(null)
          setSource('lrclib')
          setStatus('synced')
          return
        }

        if (lyrics.plainLyrics) {
          setFetchedLrcText(null)
          setPlainLyrics(lyrics.plainLyrics)
          setSource('plain')
          setStatus('plain')
          return
        }

        setFetchedLrcText(null)
        setPlainLyrics(null)
        setSource('mock')
        setStatus(lyrics.instrumental ? 'instrumental' : 'empty')
      } catch {
        if (!controller.signal.aborted) {
          setFetchedLrcText(null)
          setPlainLyrics(null)
          setSource('mock')
          setStatus('error')
        }
      }
    }

    void loadLyrics()

    return () => controller.abort()
  }, [albumName, artistName, durationMs, trackName])

  return (
    <div className="font-mono text-sm">
      <div className="mb-4 flex items-center justify-between border-b border-cyber-pink/30 pb-3 text-xs uppercase tracking-[0.18em]">
        <span className="text-cyber-cyan">LYRICS_STREAM: {trackName ? 'sync' : 'idle'}</span>
        <span className="text-cyber-muted">source: {source} / {status}</span>
      </div>

      <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-2 text-cyber-muted" ref={containerRef}>
        {lines.map((line, index) => {
          const isActive = index === activeIndex

          return (
            <p
              className={
                isActive
                  ? 'border-l-2 border-cyber-pink bg-cyber-pink/10 px-3 py-2 text-base font-bold text-white shadow-[0_0_18px_rgba(255,46,214,0.22)]'
                  : 'border-l-2 border-transparent px-3 py-1 text-cyber-muted'
              }
              key={`${line.timeMs}-${line.text}`}
              ref={isActive ? activeLineRef : null}
            >
              <span className="mr-3 text-xs text-cyber-cyan">[{Math.floor(line.timeMs / 1000).toString().padStart(3, '0')}]</span>
              {line.text}
            </p>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-cyber-pink">Lyrics powered by LRCLIB when available.</p>
    </div>
  )
}

export const LyricsPanel = memo(LyricsPanelComponent)
