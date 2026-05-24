const CACHE_PREFIX = 'cybertify_translation_'

export function getCachedTranslation(trackName: string, artistName: string, targetLang: string): string[] | null {
  try {
    const key = `${CACHE_PREFIX}${trackName}_${artistName}_${targetLang}`
    const cached = localStorage.getItem(key)
    if (cached) {
      return JSON.parse(cached) as string[]
    }
  } catch (error) {
    console.error('Failed to read translation from cache:', error)
  }
  return null
}

export function setCachedTranslation(trackName: string, artistName: string, targetLang: string, lines: string[]): void {
  try {
    const key = `${CACHE_PREFIX}${trackName}_${artistName}_${targetLang}`
    localStorage.setItem(key, JSON.stringify(lines))
  } catch (error) {
    console.error('Failed to write translation to cache:', error)
  }
}
