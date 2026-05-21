import { memo } from 'react'

type AlbumCoverProps = {
  imageUrl?: string
  title?: string
}

function AlbumCoverComponent({ imageUrl, title = 'Album cover' }: AlbumCoverProps) {
  return (
    <div className="aspect-square w-full border border-[#333] bg-[#1a1a1a]">
      {imageUrl ? (
        <img className="h-full w-full object-cover" src={imageUrl} alt={title} />
      ) : (
        <div className="flex h-full items-center justify-center text-xs uppercase text-[#666]">
          No Signal
        </div>
      )}
    </div>
  )
}

export const AlbumCover = memo(AlbumCoverComponent)
