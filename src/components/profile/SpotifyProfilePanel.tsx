import { memo, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    navigate(paths.login, { replace: true })
  }, [navigate])

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
        navigate(paths.login, { replace: true })
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
        // Optionally redirect on fetch error too, but we might just show the error first
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('token'))) {
          navigate(paths.login, { replace: true })
        }
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

  const hour = time.getHours()
  let greeting = 'SISTEMA INICIADO // BUENOS DÍAS'
  if (hour >= 12 && hour < 20) {
    greeting = 'EN LÍNEA // BUENAS TARDES'
  } else if (hour >= 20 || hour < 6) {
    greeting = 'HACKEANDO LA RED // BUENAS NOCHES'
  }

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')

  return (
    <div className="relative grid gap-6 md:grid-cols-[120px_1fr]">
      <a 
        href={profile.external_urls.spotify} 
        target="_blank" 
        rel="noreferrer"
        className="block h-[120px] w-[120px] overflow-hidden border border-[#333] bg-[#1a1a1a] transition-all hover:scale-105 hover:border-[var(--color-dynamic-primary,#00f5ff)] hover:shadow-[0_0_15px_var(--color-dynamic-glow,rgba(0,245,255,0.3))] cursor-pointer"
        title="Open Spotify profile"
      >
        {avatar ? <img className="h-full w-full object-cover" src={avatar.url} alt={profile.display_name ?? profile.id} /> : null}
      </a>
      <div className="text-sm text-[#999]">
        <p className="mb-2 uppercase tracking-wider text-green-400">{greeting}</p>
        <h1 className="mb-3 text-2xl font-bold uppercase text-white">{profile.display_name ?? profile.id}</h1>
        <p>User ID: {profile.id}</p>
        <p>Email: {profile.email ?? 'Not available'}</p>
        <p>Spotify URI: {profile.uri}</p>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center gap-4">
        <div 
          className="grid auto-cols-max grid-flow-col gap-2 sm:gap-4 text-center items-center"
          style={{ 
            color: 'var(--color-dynamic-primary, #00f5ff)', 
            textShadow: '0 0 10px var(--color-dynamic-glow, rgba(0, 245, 255, 0.3))' 
          }}
        >
          <div className="flex flex-col items-center">
            <div className="relative h-[48px] sm:h-[60px] overflow-hidden flex justify-center items-center w-16 sm:w-20">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={hours}
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-5xl sm:text-6xl font-bold absolute leading-none"
                >
                  {hours}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="text-[10px] sm:text-xs uppercase text-[#999] tracking-widest mt-1 sm:mt-2" style={{ textShadow: 'none', color: '#999' }}>hours</span>
          </div>
          <span className="text-4xl sm:text-5xl pb-5 sm:pb-7 opacity-50 animate-pulse leading-none">:</span>
          <div className="flex flex-col items-center">
            <div className="relative h-[48px] sm:h-[60px] overflow-hidden flex justify-center items-center w-16 sm:w-20">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={minutes}
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-5xl sm:text-6xl font-bold absolute leading-none"
                >
                  {minutes}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="text-[10px] sm:text-xs uppercase text-[#999] tracking-widest mt-1 sm:mt-2" style={{ textShadow: 'none', color: '#999' }}>min</span>
          </div>
          <span className="text-4xl sm:text-5xl pb-5 sm:pb-7 opacity-50 animate-pulse leading-none">:</span>
          <div className="flex flex-col items-center">
            <div className="relative h-[48px] sm:h-[60px] overflow-hidden flex justify-center items-center w-16 sm:w-20">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={seconds}
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-5xl sm:text-6xl font-bold absolute leading-none"
                >
                  {seconds}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="text-[10px] sm:text-xs uppercase text-[#999] tracking-widest mt-1 sm:mt-2" style={{ textShadow: 'none', color: '#999' }}>sec</span>
          </div>
        </div>
        <button 
          className="rounded border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105" 
          style={{ 
            borderColor: 'var(--color-dynamic-primary, #00f5ff)', 
            color: 'var(--color-dynamic-primary, #00f5ff)',
            boxShadow: '0 0 10px var(--color-dynamic-glow, transparent)'
          }}
          type="button" 
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export const SpotifyProfilePanel = memo(SpotifyProfilePanelComponent)
