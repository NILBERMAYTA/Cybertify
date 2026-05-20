import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { isSpotifyConfigured, spotifyConfig } from '../../app/config'
import { paths } from '../../app/paths'
import { TerminalPanel } from '../../components/layout/TerminalPanel'
import { TerminalShell } from '../../components/layout/TerminalShell'
import { getAccessTokenFromCode, redirectToSpotifyLogin } from './spotifyAuth'

type CallbackState = 'loading' | 'success' | 'error'

export function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Processing Spotify authorization response...')
  const [callbackState, setCallbackState] = useState<CallbackState>('loading')

  const restartLogin = useCallback(async () => {
    if (!isSpotifyConfigured()) {
      setCallbackState('error')
      setStatus('Configura VITE_SPOTIFY_CLIENT_ID en .env antes de iniciar sesion con Spotify.')
      return
    }

    await redirectToSpotifyLogin(spotifyConfig)
  }, [])

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    async function exchangeCode() {
      if (error) {
        setCallbackState('error')
        setStatus(`Spotify authorization failed: ${error}`)
        return
      }

      if (!code) {
        setCallbackState('error')
        setStatus('No authorization code found in callback URL.')
        return
      }

      try {
        await getAccessTokenFromCode(spotifyConfig, code)
        setCallbackState('success')
        setStatus('Login correcto. Redirigiendo a /home...')
        navigate(paths.home, { replace: true })
      } catch (requestError) {
        setCallbackState('error')
        setStatus(requestError instanceof Error ? requestError.message : 'Could not exchange Spotify code.')
      }
    }

    void exchangeCode()
  }, [navigate, searchParams])

  return (
    <TerminalShell contentClassName="flex items-center justify-center px-4">
      <TerminalPanel title="spotify callback" className="w-full max-w-xl">
        <div className="space-y-5 font-mono text-sm">
          <p
            className={
              callbackState === 'success'
                ? 'text-cyber-cyan'
                : callbackState === 'error'
                  ? 'text-cyber-pink'
                  : 'text-cyber-muted'
            }
          >
            {status}
          </p>
          {callbackState === 'error' ? (
            <div className="space-y-3">
              <p className="text-cyber-muted">
                Usa solo el Client ID en el frontend. No pegues el Client Secret en esta app.
              </p>
              <button className="terminal-button terminal-button-primary" type="button" onClick={restartLogin}>
                Reintentar login
              </button>
            </div>
          ) : null}
        </div>
      </TerminalPanel>
    </TerminalShell>
  )
}
