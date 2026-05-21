export async function extractColors(imageUrl: string) {
  if (!imageUrl) {
    return {
      primaryColor: '#00f5ff',
      glowColor: 'rgba(0, 245, 255, 0.3)',
    }
  }

  return new Promise<{ primaryColor: string; glowColor: string }>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      
      if (!ctx) {
        resolve({ primaryColor: '#00f5ff', glowColor: 'rgba(0, 245, 255, 0.3)' })
        return
      }
      
      ctx.drawImage(img, 0, 0, 1, 1)
      const data = ctx.getImageData(0, 0, 1, 1).data
      const r = data[0]
      const g = data[1]
      const b = data[2]

      // Boost brightness if the cover is extremely dark
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      let pr = r, pg = g, pb = b
      if (brightness < 40) {
        pr = Math.min(255, r + 50)
        pg = Math.min(255, g + 50)
        pb = Math.min(255, b + 50)
      }

      resolve({
        primaryColor: `rgb(${pr}, ${pg}, ${pb})`,
        glowColor: `rgba(${pr}, ${pg}, ${pb}, 0.4)`,
      })
    }
    
    img.onerror = () => resolve({ primaryColor: '#00f5ff', glowColor: 'rgba(0, 245, 255, 0.3)' })
    img.src = imageUrl
  })
}
