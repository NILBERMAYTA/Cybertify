import { memo, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../app/paths'
import { getStoredSpotifySession, logout, refreshAccessToken } from '../../features/auth/spotifyAuth'
import { spotifyConfig } from '../../app/config'
import { fetchProfile } from '../../features/spotify/spotifyApi'
import type { SpotifyUserProfile } from '../../features/spotify/spotifyTypes'

type ProfileState =
  | { status: 'loading'; message: string; profile: null }
  | { status: 'success'; message: string; profile: SpotifyUserProfile }
  | { status: 'error'; message: string; profile: null }

const initialProfileState: ProfileState = {
  status: 'loading',
  message: 'Loading profile...',
  profile: null,
}

function SpotifyProfilePanelComponent() {
  const [profileState, setProfileState] = useState<ProfileState>(initialProfileState)

  const handleLogout = useCallback(() => {
    logout()
    setProfileState({
      status: 'error',
      message: 'Sesion cerrada. Login again from /.',
      profile: null,
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function resolveAccessToken() {
      const session = getStoredSpotifySession()

      if (session.accessToken && (!session.expiresAt || session.expiresAt > Date.now() + 30_000)) {
        return session.accessToken
      }

      if (session.refreshToken) {
        return refreshAccessToken(spotifyConfig)
      }

      return null
    }

    async function loadProfile() {
      const accessToken = await resolveAccessToken()

      if (!accessToken) {
        setProfileState({
          status: 'error',
          message: 'No Spotify access token found. Login again from /.',
          profile: null,
        })
        return
      }

      try {
        const profile = await fetchProfile(accessToken, controller.signal)
        setProfileState({ status: 'success', message: 'Profile loaded.', profile })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setProfileState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not fetch Spotify profile.',
          profile: null,
        })
      }
    }

    void loadProfile()

    return () => controller.abort()
  }, [])

  if (profileState.status !== 'success') {
    return (
      <p className={profileState.status === 'error' ? 'text-sm text-red-400' : 'text-sm text-[#999]'}>
        {profileState.message}
      </p>
    )
  }

  const { profile } = profileState
  const avatar = profile.images[0]

  return (
    <div className="grid gap-4 md:grid-cols-[96px_1fr]">
      <div className="h-24 w-24 overflow-hidden border border-[#333] bg-[#1a1a1a]">
        {avatar ? <img className="h-full w-full object-cover" src={avatar.url} alt={profile.display_name ?? profile.id} /> : null}
      </div>
      <div className="text-sm text-[#999]">
        <p className="mb-2 uppercase tracking-wider text-green-400">Login correcto</p>
        <h1 className="mb-3 text-2xl font-bold uppercase text-white">{profile.display_name ?? profile.id}</h1>
        <p>User ID: {profile.id}</p>
        <p>Email: {profile.email ?? 'Not available'}</p>
        <p>Spotify URI: {profile.uri}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link className="text-blue-400 underline" to={paths.player}>
            Open Cybertify player
          </Link>
          <a className="text-blue-400 underline" href={profile.external_urls.spotify} target="_blank" rel="noreferrer">
            Open Spotify profile
          </a>
          <button className="text-red-400 underline" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export const SpotifyProfilePanel = memo(SpotifyProfilePanelComponent)
