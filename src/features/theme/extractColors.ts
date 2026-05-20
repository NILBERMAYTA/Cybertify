import { FastAverageColor } from 'fast-average-color'

const colorExtractor = new FastAverageColor()

export async function extractColors(imageUrl: string) {
  const color = await colorExtractor.getColorAsync(imageUrl)
  const [red, green, blue] = color.value

  return {
    backgroundColor: color.isDark ? '#05070f' : '#111827',
    glowColor: `rgba(${red}, ${green}, ${blue}, 0.42)`,
    primaryColor: color.hex,
    secondaryColor: color.isDark ? '#ff2ed6' : '#00f5ff',
  }
}
