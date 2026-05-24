export type TranslateParams = {
  texts: string[]
  targetLang: string
  sourceLang?: string
}

export async function translateLyrics(
  { texts, targetLang, sourceLang = 'auto' }: TranslateParams,
  signal?: AbortSignal,
): Promise<string[] | null> {
  if (!texts.length) return []

  try {
    const joinedText = texts.join('\n')
    
    // Defaulting to Google Translate unofficial API as a highly reliable fallback, 
    // since public LibreTranslate endpoints are blocking requests without API keys.
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(joinedText)}`

    const response = await fetch(url, { signal })

    if (!response.ok) {
      console.warn('Translate API Error:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    // Google returns an array of arrays where [0][i][0] is the translated string segment
    if (data && data[0]) {
      const translatedText = data[0].map((item: any) => item[0]).join('')
      return translatedText.split('\n').map((line: string) => line.trim())
    }
    
    return null
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Translation failed:', error)
    }
    return null
  }
}
