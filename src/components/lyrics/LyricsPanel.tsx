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
  { timeMs: 0, text: 'Waiting for track...' },
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
    <div className="text-sm">
      <div className="mb-3 flex items-center justify-between border-b border-[#333] pb-2 text-xs uppercase">
        <span className="text-[#999]">LYRICS: {trackName ? 'sync' : 'idle'}</span>
        <span className="text-[#666]">source: {source} / {status}</span>
      </div>

      <div className="scrollbar-hide max-h-[48vh] space-y-1 overflow-y-auto pr-2 text-[#999]" ref={containerRef}>
        {lines.map((line, index) => {
          const isActive = index === activeIndex

          return (
            <p
              className={
                isActive
                  ? 'border-l-2 border-white bg-[#222] px-3 py-1 text-base font-bold text-white'
                  : 'border-l-2 border-transparent px-3 py-1 text-[#888]'
              }
              key={`${line.timeMs}-${line.text}`}
              ref={isActive ? activeLineRef : null}
            >
              <span className="mr-2 text-xs text-[#666]">[{Math.floor(line.timeMs / 1000).toString().padStart(3, '0')}]</span>
              {line.text}
            </p>
          )
        })}
      </div>
    </div>
  )
}

export const LyricsPanel = memo(LyricsPanelComponent)
