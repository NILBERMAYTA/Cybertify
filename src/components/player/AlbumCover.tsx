import { memo, useEffect, useState } from 'react'

type AlbumCoverProps = {
  imageUrl?: string
  title?: string
  isPlaying?: boolean
}

function AlbumCoverComponent({ imageUrl, title = 'Album cover', isPlaying = false }: AlbumCoverProps) {
  const [glitchVariant, setGlitchVariant] = useState(1)

  useEffect(() => {
    // Randomly pick variant 1, 2, or 3 when the image changes
    setGlitchVariant(Math.floor(Math.random() * 3) + 1)
  }, [imageUrl])

  return (
    <div className="relative aspect-square w-full overflow-hidden border border-[#333] bg-[#1a1a1a]">
      {imageUrl ? (
        <>
          <img className="h-full w-full object-cover" src={imageUrl} alt={title} />
          {isPlaying && (
            <div
              className={`absolute inset-0 pointer-events-none glitch-overlay-${glitchVariant}`}
              style={{ '--bg-image': `url(${imageUrl})` } as React.CSSProperties}
            />
          )}
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-xs uppercase text-[#666]">
          No Signal
        </div>
      )}
    </div>
  )
}

export const AlbumCover = memo(AlbumCoverComponent)
