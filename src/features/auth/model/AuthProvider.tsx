import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  getCurrentUser,
  loginWithPassword,
  logoutWithToken,
  refreshWithToken,
} from '@/features/auth/api/authApi'
import type { AuthSession, AuthStatus, AuthUser } from './types'
import { configureAuthFetch } from './authFetch'

const storageKey = 'axiom.auth.session'

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (
      typeof parsed.accessToken !== 'string'
      || typeof parsed.refreshToken !== 'string'
      || typeof parsed.user !== 'object'
      || parsed.user === null
    ) return null
    return parsed as AuthSession
  } catch {
    return null
  }
}

function writeStoredSession(session: AuthSession | null) {
  if (session) {
    window.localStorage.setItem(storageKey, JSON.stringify(session))
    return
  }
  window.localStorage.removeItem(storageKey)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthStatus>('restoring')
  const sessionRef = useRef<AuthSession | null>(null)

  const updateSession = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession
    setSession(nextSession)
    writeStoredSession(nextSession)
    setStatus(nextSession ? 'authenticated' : 'unauthenticated')
  }, [])

  const clearSession = useCallback(() => {
    updateSession(null)
  }, [updateSession])

  const refresh = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken
    if (!refreshToken) return false
    try {
      const tokenResponse = await refreshWithToken(refreshToken)
      updateSession({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        user: tokenResponse.user,
      })
      return true
    } catch {
      clearSession()
      return false
    }
  }, [clearSession, updateSession])

  useEffect(() => {
    configureAuthFetch({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      refreshAccessToken: refresh,
      onUnauthorized: clearSession,
    })
  }, [clearSession, refresh])

  useEffect(() => {
    const controller = new AbortController()
    const storedSession = readStoredSession()
    sessionRef.current = storedSession
    setSession(storedSession)

    if (!storedSession) {
      setStatus('unauthenticated')
      return () => controller.abort()
    }

    getCurrentUser(storedSession.accessToken, controller.signal)
      .then((response) => {
        updateSession({ ...storedSession, user: response.user })
      })
      .catch(() => {
        if (!controller.signal.aborted) clearSession()
      })

    return () => controller.abort()
  }, [clearSession, updateSession])

  const login = useCallback(
    async (email: string, password: string) => {
      const tokenResponse = await loginWithPassword(email, password)
      updateSession({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        user: tokenResponse.user,
      })
    },
    [updateSession],
  )

  const logout = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken
    clearSession()
    if (!refreshToken) return
    try {
      await logoutWithToken(refreshToken)
    } catch {
      // Local logout must succeed even when the backend session is already gone.
    }
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      login,
      logout,
      refresh,
    }),
    [login, logout, refresh, session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
