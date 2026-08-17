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
  createOrganization,
  logoutWithToken,
  registerOrganization,
  refreshWithToken,
  switchOrganization,
} from '@/features/auth/api/authApi'
import type {
  AuthError,
  AuthSession,
  AuthStatus,
  AuthUser,
  CreateOrganizationInput,
  RegisterOrganizationInput,
} from './types'
import { getAuthError } from './authErrors'
import {
  configureAuthFetch,
  resetAuthFetchUnauthorizedState,
  type AuthRefreshResult,
} from './authFetch'

const storageKey = 'axiom.auth.session'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  restoreError: AuthError | null
  sessionEndReason: 'session-expired' | null
  login: (email: string, password: string) => Promise<void>
  createOrganization: (input: CreateOrganizationInput) => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  retryRestore: () => Promise<void>
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

function isAbortError(cause: unknown) {
  return cause instanceof DOMException
    ? cause.name === 'AbortError'
    : typeof cause === 'object'
      && cause !== null
      && 'name' in cause
      && cause.name === 'AbortError'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthStatus>('restoring')
  const [restoreError, setRestoreError] = useState<AuthError | null>(null)
  const [sessionEndReason, setSessionEndReason] = useState<'session-expired' | null>(null)
  const sessionRef = useRef<AuthSession | null>(null)

  const updateSession = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession
    setSession(nextSession)
    writeStoredSession(nextSession)
    setStatus(nextSession ? 'authenticated' : 'unauthenticated')
    if (nextSession) {
      resetAuthFetchUnauthorizedState()
      setRestoreError(null)
      setSessionEndReason(null)
    }
  }, [])

  const clearSession = useCallback(() => {
    updateSession(null)
    setRestoreError(null)
    setSessionEndReason(null)
  }, [updateSession])

  const expireSession = useCallback(() => {
    updateSession(null)
    setRestoreError(null)
    setSessionEndReason('session-expired')
  }, [updateSession])

  const refreshForRestore = useCallback(async (signal?: AbortSignal) => {
    const refreshToken = sessionRef.current?.refreshToken
    if (!refreshToken) return { expired: true, error: null }

    try {
      const tokenResponse = await refreshWithToken(refreshToken, signal)
      if (signal?.aborted) return { expired: false, error: null }
      updateSession({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        user: tokenResponse.user,
      })
      return { expired: false, error: null }
    } catch (cause) {
      if (isAbortError(cause)) return { expired: false, error: null }
      const error = getAuthError(cause, 'session')
      return { expired: error.kind === 'session', error }
    }
  }, [updateSession])

  const refreshForAuthFetch = useCallback(async (): Promise<AuthRefreshResult> => {
    const refreshAttempt = await refreshForRestore()
    if (refreshAttempt.expired) return 'expired'
    return refreshAttempt.error ? 'unavailable' : 'refreshed'
  }, [refreshForRestore])

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
    } catch (cause) {
      if (getAuthError(cause, 'session').kind === 'session') {
        expireSession()
      }
      return false
    }
  }, [expireSession, updateSession])

  const restoreSession = useCallback(async (signal?: AbortSignal) => {
    const storedSession = readStoredSession()
    sessionRef.current = storedSession
    setSession(storedSession)
    setRestoreError(null)
    setSessionEndReason(null)
    setStatus('restoring')

    if (!storedSession) {
      writeStoredSession(null)
      setStatus('unauthenticated')
      return
    }

    try {
      const response = await getCurrentUser(storedSession.accessToken, signal)
      if (signal?.aborted) return
      updateSession({ ...storedSession, user: response.user })
    } catch (cause) {
      if (signal?.aborted || isAbortError(cause)) return
      const error = getAuthError(cause, 'session')
      if (error.kind === 'session') {
        const refreshAttempt = await refreshForRestore(signal)
        if (signal?.aborted) return
        if (refreshAttempt.expired) {
          expireSession()
          return
        }
        if (refreshAttempt.error) {
          setRestoreError(refreshAttempt.error)
        }
        return
      }
      setRestoreError(error)
    }
  }, [expireSession, refreshForRestore, updateSession])

  const retryRestore = useCallback(async () => {
    await restoreSession()
  }, [restoreSession])

  useEffect(() => {
    configureAuthFetch({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      refreshAccessToken: refreshForAuthFetch,
      onUnauthorized: expireSession,
    })
  }, [expireSession, refreshForAuthFetch])

  useEffect(() => {
    const controller = new AbortController()
    void restoreSession(controller.signal)

    return () => controller.abort()
  }, [restoreSession])

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

  const createOrganizationForUser = useCallback(
    async (input: CreateOrganizationInput) => {
      const accessToken = sessionRef.current?.accessToken
      if (!accessToken) throw new Error('Sign in to create an organization.')
      const tokenResponse = await createOrganization(input, accessToken)
      updateSession({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        user: tokenResponse.user,
      })
    },
    [updateSession],
  )

  const switchOrganizationForUser = useCallback(
    async (organizationId: string) => {
      const accessToken = sessionRef.current?.accessToken
      if (!accessToken) throw new Error('Sign in to switch organizations.')
      const tokenResponse = await switchOrganization(organizationId, accessToken)
      updateSession({ accessToken: tokenResponse.access_token, refreshToken: tokenResponse.refresh_token, user: tokenResponse.user })
    }, [updateSession],
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
      restoreError,
      sessionEndReason,
      login,
      createOrganization: createOrganizationForUser,
      switchOrganization: switchOrganizationForUser,
      logout,
      refresh,
      retryRestore,
    }),
    [createOrganizationForUser, login, logout, refresh, restoreError, retryRestore, session, sessionEndReason, status, switchOrganizationForUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
