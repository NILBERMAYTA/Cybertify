import { memo } from 'react'

type AlbumCoverProps = {
  imageUrl?: string
  title?: string
  isPlaying?: boolean
}

function AlbumCoverComponent({ imageUrl, title = 'Album cover', isPlaying = false }: AlbumCoverProps) {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-[#333] bg-[#1a1a1a]">
      {imageUrl ? (
        <>
          <img className="h-full w-full object-cover" src={imageUrl} alt={title} />
          {isPlaying && (
            <div
              className="glitch-overlay absolute inset-0 pointer-events-none"
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
