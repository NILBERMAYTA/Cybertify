import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { paths } from './paths'

const CallbackPage = lazy(() => import('../features/auth/CallbackPage').then((module) => ({ default: module.CallbackPage })))
const HomePage = lazy(() => import('../pages/HomePage').then((module) => ({ default: module.HomePage })))
const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const PlayerPage = lazy(() => import('../pages/PlayerPage').then((module) => ({ default: module.PlayerPage })))

export const routes: RouteObject[] = [
  {
    path: paths.login,
    element: <LoginPage />,
  },
  {
    path: paths.callback,
    element: <CallbackPage />,
  },
  {
    path: paths.home,
    element: <HomePage />,
  },
  {
    path: paths.player,
    element: <PlayerPage />,
  },
  {
    path: '*',
    element: <Navigate to={paths.login} replace />,
  },
]
