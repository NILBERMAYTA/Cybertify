import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { getLyricsFromLrcLib } from '../../features/lyrics/lrclibApi'
import { translateLyrics } from '../../features/lyrics/translateApi'
import { getCachedTranslation, setCachedTranslation } from '../../features/lyrics/translationCache'

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
  const activeLineRef = useRef<HTMLDivElement | null>(null)
  const [fetchedLrcText, setFetchedLrcText] = useState<string | null>(null)
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null)
  const [source, setSource] = useState<'lrclib' | 'mock' | 'plain'>('mock')
  const [status, setStatus] = useState('waiting')
  
  // Translation State
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatedLines, setTranslatedLines] = useState<string[]>([])
  const [targetLang, setTargetLang] = useState<'es' | 'en'>('es')

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

  // Scroll to active line
  useEffect(() => {
    const container = containerRef.current
    const activeLine = activeLineRef.current

    if (container && activeLine) {
      const containerHeight = container.clientHeight
      const lineTop = activeLine.offsetTop
      const lineHeight = activeLine.clientHeight

      container.scrollTo({
        top: lineTop - containerHeight / 2 + lineHeight / 2,
        behavior: 'smooth',
      })
    }
  }, [activeIndex])

  // Fetch lyrics
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

  // Translation Effect
  useEffect(() => {
    if (!isTranslationEnabled || lines === mockLyrics || !trackName || !artistName) {
      return
    }

    const textsToTranslate = lines.map(line => line.text)
    if (textsToTranslate.length === 0) return

    // Check Cache
    const cached = getCachedTranslation(trackName, artistName, targetLang)
    if (cached && cached.length >= textsToTranslate.length) {
      setTranslatedLines(cached)
      return
    }

    const controller = new AbortController()

    async function doTranslation() {
      setIsTranslating(true)
      const result = await translateLyrics({ texts: textsToTranslate, targetLang }, controller.signal)
      
      if (!controller.signal.aborted) {
        setIsTranslating(false)
        if (result) {
          setTranslatedLines(result)
          setCachedTranslation(trackName!, artistName!, targetLang, result)
        }
      }
    }

    void doTranslation()

    return () => {
      controller.abort()
      setIsTranslating(false)
    }
  }, [lines, isTranslationEnabled, trackName, artistName, targetLang])

  return (
    <div className="text-sm">
      <div className="mb-3 flex items-center justify-between border-b border-[#333] pb-2 text-xs uppercase">
        <span className="text-[#999]">LYRICS: {trackName ? 'sync' : 'idle'}</span>
        <div className="flex items-center gap-4">
          {isTranslationEnabled && (
            <div className="flex items-center gap-1 border border-[#333] rounded px-1">
              <button 
                onClick={() => setTargetLang('es')}
                className={`px-2 py-0.5 ${targetLang === 'es' ? 'bg-[#333] text-white' : 'text-[#666] hover:text-[#999]'}`}
              >
                ES
              </button>
              <button 
                onClick={() => setTargetLang('en')}
                className={`px-2 py-0.5 ${targetLang === 'en' ? 'bg-[#333] text-white' : 'text-[#666] hover:text-[#999]'}`}
              >
                EN
              </button>
            </div>
          )}
          <button
            onClick={() => setIsTranslationEnabled(!isTranslationEnabled)}
            className={`transition-colors hover:text-white ${isTranslationEnabled ? 'text-[var(--color-dynamic-primary,#00f5ff)]' : 'text-[#666]'}`}
            title="Translate Lyrics"
          >
            {isTranslating ? 'TRANSLATING...' : 'TRADUCIR'}
          </button>
          <span className="text-[#666]">source: {source} / {status}</span>
        </div>
      </div>

      <div className="scrollbar-hide relative max-h-[48vh] space-y-1 overflow-y-auto pr-2 text-[#999]" ref={containerRef}>
        {lines.map((line, index) => {
          const isActive = index === activeIndex
          const isPrev = index === activeIndex - 1
          const isNext = index === activeIndex + 1

          let className = 'border-l-2 border-transparent px-3 py-1 text-[#888] transition-all duration-300 flex flex-col'
          let style: React.CSSProperties = {}

          if (isActive) {
            className = 'border-l-2 px-3 py-2 text-lg font-bold transition-all duration-300 flex flex-col'
            style = { 
              color: '#ffffff',
              borderColor: 'var(--color-dynamic-primary, #00f5ff)',
              background: 'linear-gradient(90deg, var(--color-dynamic-glow, rgba(0,245,255,0.15)) 0%, transparent 100%)',
              textShadow: '0 0 12px rgba(255, 255, 255, 0.9), 0 0 25px rgba(255, 255, 255, 0.5)',
              transform: 'scale(1.02) translateX(2px)',
              transformOrigin: 'left center'
            }
          } else if (isPrev || isNext) {
            className = 'border-l-2 border-transparent px-3 py-1 transition-all duration-300 flex flex-col'
            style = {
              color: 'var(--color-dynamic-primary, #00f5ff)',
              opacity: 0.85,
              textShadow: 'none'
            }
          }

          return (
            <div
              className={className}
              style={style}
              key={`${line.timeMs}-${line.text}`}
              ref={isActive ? activeLineRef : null}
            >
              <p>
                <span className="mr-2 text-xs text-[#666] opacity-70">[{Math.floor(line.timeMs / 1000).toString().padStart(3, '0')}]</span>
                {line.text}
              </p>
              {isTranslationEnabled && translatedLines[index] && (
                <p 
                  className={`mt-1 text-[0.85em] ${isActive ? 'opacity-100 font-medium' : 'opacity-60'}`} 
                  style={{
                    color: isActive ? 'var(--color-dynamic-secondary, #ff00f5)' : 'inherit',
                    textShadow: isActive ? '0 0 10px var(--color-dynamic-secondary, rgba(255,0,245,0.5))' : 'none'
                  }}
                >
                  {translatedLines[index]}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const LyricsPanel = memo(LyricsPanelComponent)
