import type {
  AuthTokenResponse,
  AuthUser,
  CreateOrganizationUserInput,
  CurrentUserResponse,
  OrganizationRegistrationResponse,
  CreateOrganizationInput,
  RegisterOrganizationInput,
} from '@/features/auth/model/types'
import {
  createAuthTransportError,
  parseAuthErrorResponse,
  type AuthErrorOperation,
} from '@/features/auth/model/authErrors'

const gatewayApiBaseUrl = (
  import.meta.env.VITE_AXIOM_GATEWAY_API_URL || ''
).replace(/\/$/, '')
const AUTH_API_BASE_URL = `${gatewayApiBaseUrl}/auth-service`.replace(/\/$/, '')

function authApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${AUTH_API_BASE_URL}${normalizedPath}`
}

async function requestAuth(
  path: string,
  init: RequestInit,
  operation: AuthErrorOperation,
  acceptedErrorStatuses: readonly number[] = [],
): Promise<Response> {
  let response: Response

  try {
    response = await fetch(authApiUrl(path), init)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw createAuthTransportError(cause, operation)
  }

  if (!response.ok && !acceptedErrorStatuses.includes(response.status)) {
    throw await parseAuthErrorResponse(response, operation)
  }

  return response
}

export async function loginWithPassword(
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<AuthTokenResponse> {
  const response = await requestAuth('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal,
  }, 'login')
  return (await response.json()) as AuthTokenResponse
}

export async function registerOrganization(
  input: RegisterOrganizationInput,
  signal?: AbortSignal,
): Promise<OrganizationRegistrationResponse> {
  const response = await requestAuth('/api/v1/orgs/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organization_name: input.organizationName,
      organization_slug: input.organizationSlug,
      admin_display_name: input.adminDisplayName,
      admin_email: input.adminEmail,
      admin_password: input.adminPassword,
    }),
    signal,
  }, 'registration')
  return (await response.json()) as OrganizationRegistrationResponse
}

export async function createOrganization(
  input: CreateOrganizationInput,
  accessToken: string,
  signal?: AbortSignal,
): Promise<OrganizationRegistrationResponse> {
  const response = await requestAuth('/api/v1/orgs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organization_name: input.organizationName,
      organization_slug: input.organizationSlug,
      // These fields are retained by the bootstrap schema and ignored for authenticated creation.
      admin_email: '', admin_display_name: '', admin_password: '',
    }),
    signal,
  }, 'organization')
  return (await response.json()) as OrganizationRegistrationResponse
}

export async function switchOrganization(
  organizationId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AuthTokenResponse> {
  const response = await requestAuth('/api/v1/auth/switch-organization', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ organization_id: organizationId }),
    signal,
  }, 'organization')
  return (await response.json()) as AuthTokenResponse
}

export async function listOrganizationUsers(
  organizationId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AuthUser[]> {
  const response = await requestAuth(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/users`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal },
    'organization',
  )
  const payload = (await response.json()) as { users: AuthUser[] }
  return payload.users
}

export async function createOrganizationUser(
  organizationId: string,
  input: CreateOrganizationUserInput,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  const response = await requestAuth(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/users`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: input.displayName,
        email: input.email,
        password: input.password || undefined,
        org_role: input.orgRole,
      }),
      signal,
    },
    'organization',
  )
  return (await response.json()) as AuthUser
}

export async function updateOrganizationUser(
  organizationId: string,
  userId: string,
  orgRole: AuthUser['org_role'],
  accessToken: string,
): Promise<AuthUser> {
  const response = await requestAuth(`/api/v1/orgs/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_role: orgRole }),
  }, 'organization')
  return (await response.json()) as AuthUser
}

export async function removeOrganizationUser(
  organizationId: string,
  userId: string,
  accessToken: string,
): Promise<void> {
  await requestAuth(`/api/v1/orgs/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
  }, 'organization')
}

export async function refreshWithToken(
  refreshToken: string,
  signal?: AbortSignal,
): Promise<AuthTokenResponse> {
  const response = await requestAuth('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal,
  }, 'session')
  return (await response.json()) as AuthTokenResponse
}

export async function logoutWithToken(
  refreshToken: string,
  signal?: AbortSignal,
): Promise<void> {
  await requestAuth('/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal,
  }, 'session', [401])
}

export async function getCurrentUser(
  accessToken: string,
  signal?: AbortSignal,
): Promise<CurrentUserResponse> {
  const response = await requestAuth('/api/v1/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  }, 'session')
  return (await response.json()) as CurrentUserResponse
}
