import { memo } from 'react'

type AlbumCoverProps = {
  imageUrl?: string
  title?: string
}

function AlbumCoverComponent({ imageUrl, title = 'Album cover' }: AlbumCoverProps) {
  return (
    <div className="aspect-square w-full border border-cyber-pink/35 bg-cyber-panel shadow-[0_0_30px_rgba(255,46,214,0.12)]">
      {imageUrl ? (
        <img className="h-full w-full object-cover" src={imageUrl} alt={title} />
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.24em] text-cyber-muted">
          No Signal
        </div>
      )}
    </div>
  )
}

export const AlbumCover = memo(AlbumCoverComponent)
