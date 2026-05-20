import { create } from 'zustand'
import { extractColors } from './extractColors'

type ThemeState = {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  glowColor: string
  setThemeFromAlbum: (albumImage: string) => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  primaryColor: '#00f5ff',
  secondaryColor: '#ff2ed6',
  backgroundColor: '#05070f',
  glowColor: 'rgba(0, 245, 255, 0.42)',
  setThemeFromAlbum: async (albumImage) => {
    if (!albumImage) {
      return
    }

    const colors = await extractColors(albumImage)
    set(colors)
  },
}))
