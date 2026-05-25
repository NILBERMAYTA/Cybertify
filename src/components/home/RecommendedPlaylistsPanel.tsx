import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getValidAccessToken } from '../../features/auth/spotifyAuth'
import { spotifyConfig } from '../../app/config'
import { getUserPlaylists, play, searchPlaylists } from '../../features/spotify/spotifyApi'
import type { SpotifyPlaylist } from '../../features/spotify/spotifyTypes'
import { paths } from '../../app/paths'

type PlaylistSection = {
  title: string
  playlists: SpotifyPlaylist[]
}

function PlaylistCarousel({ section }: { section: PlaylistSection }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  const handlePlay = async (uri: string) => {
    const token = await getValidAccessToken(spotifyConfig)
    if (!token) return

    try {
      await play(token, { context_uri: uri })
      navigate(paths.player)
    } catch (err) {
      console.error('Failed to play playlist', err)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-full min-w-0 relative group/carousel">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-wide">{section.title}</h2>
        <div className="flex gap-2 opacity-0 transition-opacity duration-300 group-hover/carousel:opacity-100">
          <button 
            onClick={() => scroll('left')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222] text-[#999] hover:bg-[#333] hover:text-white hover:shadow-[0_0_10px_#00f5ff] transition-all"
          >
            &lt;
          </button>
          <button 
            onClick={() => scroll('right')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222] text-[#999] hover:bg-[#333] hover:text-white hover:shadow-[0_0_10px_#00f5ff] transition-all"
          >
            &gt;
          </button>
        </div>
      </div>
      
      {/* Contenedor con scroll horizontal */}
      <div 
        ref={scrollRef}
        className="flex w-full overflow-x-auto gap-4 pt-4 pb-6 px-1 scrollbar-hide snap-x scroll-smooth"
      >
        {section.playlists.map((playlist) => (
          <div 
            key={playlist.id} 
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-md border border-[#333] bg-[#1a1a1a] transition-all hover:border-[var(--color-dynamic-primary,#00f5ff)] hover:shadow-[0_0_15px_var(--color-dynamic-glow,rgba(0,245,255,0.2))] hover:-translate-y-1 min-w-[140px] max-w-[140px] sm:min-w-[160px] sm:max-w-[160px] snap-start shrink-0"
            onClick={() => void handlePlay(playlist.uri)}
          >
            <div className="aspect-square w-full overflow-hidden">
              {playlist.images?.[0] ? (
                <img 
                  src={playlist.images[0].url} 
                  alt={playlist.name} 
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#222] text-[#666]">
                  Sin imagen
                </div>
              )}
              
              <div className="absolute right-2 bottom-[4.5rem] flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-dynamic-primary,#00f5ff)] text-black opacity-0 shadow-[0_0_15px_var(--color-dynamic-glow,rgba(0,245,255,0.5))] transition-all duration-300 group-hover:opacity-100 group-hover:-translate-y-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-5 w-5">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col p-3">
              <h3 className="truncate text-sm font-medium text-white group-hover:text-[var(--color-dynamic-primary,#00f5ff)] transition-colors">{playlist.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-[#999]" title={playlist.description}>
                {playlist.description || `De ${playlist.owner?.display_name || 'Spotify'}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlaylistSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full max-w-full min-w-0">
      <div className="h-6 w-48 bg-[#222] rounded animate-pulse mb-1"></div>
      <div className="flex w-full overflow-hidden gap-4 pb-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div 
            key={i} 
            className="flex flex-col overflow-hidden rounded-md border border-[#333] bg-[#1a1a1a] min-w-[140px] max-w-[140px] sm:min-w-[160px] sm:max-w-[160px] shrink-0"
          >
            <div className="aspect-square w-full bg-[#222] animate-pulse"></div>
            <div className="flex flex-col p-3 gap-2">
              <div className="h-4 w-3/4 bg-[#222] rounded animate-pulse"></div>
              <div className="h-3 w-full bg-[#222] rounded animate-pulse"></div>
              <div className="h-3 w-2/3 bg-[#222] rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecommendedPlaylistsPanel() {
  const [sections, setSections] = useState<PlaylistSection[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function fetchPlaylists() {
      const token = await getValidAccessToken(spotifyConfig)
      if (!token) return

      setLoading(true)
      try {
        // Fetch user's own playlists and custom personalized searches
        const [userRes, mixRes, radioRes, thisIsRes, exitosRes] = await Promise.all([
          getUserPlaylists(token, 10).catch(() => null),
          searchPlaylists(token, 'Mix Diario', 10).catch(() => null),
          searchPlaylists(token, 'Radio', 10).catch(() => null),
          searchPlaylists(token, 'This Is', 10).catch(() => null),
          searchPlaylists(token, 'Éxitos', 10).catch(() => null),
        ])

        if (!active) return

        const newSections: PlaylistSection[] = []

        if (userRes?.items?.length) {
          newSections.push({ title: 'Tus Playlists', playlists: userRes.items.filter(Boolean) })
        }

        if (mixRes?.playlists?.items?.length) {
          newSections.push({ title: 'Tus Mixes Diarios', playlists: mixRes.playlists.items.filter(Boolean) })
        }

        if (thisIsRes?.playlists?.items?.length) {
          newSections.push({ title: 'Lo mejor de los artistas', playlists: thisIsRes.playlists.items.filter(Boolean) })
        }

        if (radioRes?.playlists?.items?.length) {
          newSections.push({ title: 'Radios recomendadas', playlists: radioRes.playlists.items.filter(Boolean) })
        }

        if (exitosRes?.playlists?.items?.length) {
          newSections.push({ title: 'Éxitos y Top Lists', playlists: exitosRes.playlists.items.filter(Boolean) })
        }

        if (active) {
          setSections(newSections)
        }
      } catch (err) {
        console.error('Failed to fetch playlists', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchPlaylists()

    return () => {
      active = false
    }
  }, [])

  if (loading && sections.length === 0) {
    return (
      <div className="flex flex-col gap-8 p-0 sm:p-2 w-full max-w-full min-w-0">
        <PlaylistSkeleton />
        <PlaylistSkeleton />
      </div>
    )
  }

  if (!loading && sections.length === 0) {
    return <div className="text-sm text-[#999] p-4">No se encontraron playlists. Asegúrate de cerrar sesión y volver a entrar para dar permisos a tus playlists.</div>
  }

  return (
    <div className="flex flex-col gap-8 p-0 sm:p-2 w-full max-w-full min-w-0">
      {sections.map((section, idx) => (
        <PlaylistCarousel key={idx} section={section} />
      ))}
    </div>
  )
}
