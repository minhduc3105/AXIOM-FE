import type {
  AuthTokenResponse,
  CurrentUserResponse,
} from '@/features/auth/model/types'

const gatewayApiBaseUrl = (
  import.meta.env.VITE_AXIOM_GATEWAY_API_URL || ''
).replace(/\/$/, '')
const AUTH_API_BASE_URL = `${gatewayApiBaseUrl}/auth-service`.replace(/\/$/, '')

function authApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${AUTH_API_BASE_URL}${normalizedPath}`
}

async function authErrorMessage(response: Response, fallback: string) {
  const text = (await response.text()).trim()
  if (!text) return fallback
  try {
    const payload: unknown = JSON.parse(text)
    if (
      typeof payload === 'object'
      && payload !== null
      && 'message' in payload
      && typeof payload.message === 'string'
    ) return payload.message
    if (
      typeof payload === 'object'
      && payload !== null
      && 'detail' in payload
      && typeof payload.detail === 'string'
    ) return payload.detail
  } catch {
    return text
  }
  return fallback
}

export async function loginWithPassword(
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<AuthTokenResponse> {
  const response = await fetch(authApiUrl('/api/v1/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal,
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('Email or password is incorrect.')
    throw new Error(await authErrorMessage(response, 'AXIOM Auth is unavailable.'))
  }
  return (await response.json()) as AuthTokenResponse
}

export async function refreshWithToken(
  refreshToken: string,
  signal?: AbortSignal,
): Promise<AuthTokenResponse> {
  const response = await fetch(authApiUrl('/api/v1/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal,
  })
  if (!response.ok) {
    throw new Error(await authErrorMessage(response, 'Session refresh failed.'))
  }
  return (await response.json()) as AuthTokenResponse
}

export async function logoutWithToken(
  refreshToken: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(authApiUrl('/api/v1/auth/logout'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal,
  })
  if (!response.ok && response.status !== 401) {
    throw new Error(await authErrorMessage(response, 'Logout failed.'))
  }
}

export async function getCurrentUser(
  accessToken: string,
  signal?: AbortSignal,
): Promise<CurrentUserResponse> {
  const response = await fetch(authApiUrl('/api/v1/auth/me'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  })
  if (!response.ok) {
    throw new Error(await authErrorMessage(response, 'Session restore failed.'))
  }
  return (await response.json()) as CurrentUserResponse
}
