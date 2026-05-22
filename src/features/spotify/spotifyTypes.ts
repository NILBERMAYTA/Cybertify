export type SpotifyImage = {
  url: string
  width: number | null
  height: number | null
}

export type SpotifyArtist = {
  id: string
  name: string
}

export type SpotifyTrack = {
  external_urls?: {
    spotify: string
  }
  id: string
  name: string
  duration_ms: number
  popularity?: number
  uri: string
  artists: SpotifyArtist[]
  album: {
    id: string
    name: string
    images: SpotifyImage[]
  }
}

export type SpotifyPlaybackState = {
  is_playing: boolean
  progress_ms: number | null
  item: SpotifyTrack | null
  shuffle_state?: boolean
  repeat_state?: 'off' | 'context' | 'track'
  device?: {
    id: string | null
    is_active: boolean
    name: string
    volume_percent: number | null
  }
}

export type SpotifySearchTracksResponse = {
  tracks: {
    href: string
    items: SpotifyTrack[]
    limit: number
    next: string | null
    offset: number
    previous: string | null
    total: number
  }
}

export type SpotifyUserProfile = {
  country?: string
  display_name: string | null
  email?: string
  explicit_content?: {
    filter_enabled: boolean
    filter_locked: boolean
  }
  external_urls: {
    spotify: string
  }
  followers: {
    href: string | null
    total: number
  }
  href: string
  id: string
  images: SpotifyImage[]
  product?: string
  type: string
  uri: string
}

export type SpotifyDevice = {
  id: string | null
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number | null
  supports_volume: boolean
}

export type SpotifyDevicesResponse = {
  devices: SpotifyDevice[]
}

