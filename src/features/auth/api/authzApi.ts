import { authFetch } from '@/features/auth/model/authFetch'

export type WorkspaceRole = 'workspace_admin' | 'editor' | 'viewer'

export type Workspace = {
  id: string
  organization_id: string
  name: string
  slug: string
  description: string | null
  status: string
  is_default: boolean
}

export type WorkspaceMembership = {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
}

export type AssignedWorkspace = Workspace & {
  // The deployed organization list route does not include membership role.
  role?: WorkspaceRole
}

export class AuthzApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthzApiError'
    this.status = status
  }
}

const gatewayApiBaseUrl = (import.meta.env.VITE_AXIOM_GATEWAY_API_URL || '').replace(/\/$/, '')
const authzApiBaseUrl = `${gatewayApiBaseUrl}/authz-service`.replace(/\/$/, '')

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text()
  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error(
      'Authorization service returned an unexpected non-JSON response. Check the API gateway/proxy configuration.',
    )
  }
}

async function request<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await authFetch(`${authzApiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok) {
    const body = await response.text()
    let detail = body
    try {
      const payload = JSON.parse(body) as { detail?: string; message?: string }
      detail = payload.detail || payload.message || body
    } catch {
      // Keep the response text when it is not JSON.
    }
    throw new AuthzApiError(
      response.status,
      detail || `Authorization service request failed (${response.status}).`,
    )
  }
  if (response.status === 204) return undefined as T
  return parseJsonResponse<T>(response)
}

export async function listWorkspaces(
  organizationId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  const payload = await request<{ workspaces: Workspace[] }>(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/workspaces`,
    accessToken,
    { signal },
  )
  return payload.workspaces
}

export async function listMyWorkspaces(
  _organizationId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  // This endpoint is membership-scoped, unlike the organization-wide collection.
  const payload = await request<{ workspaces: AssignedWorkspace[] }>(
    "/api/v1/authz/me/workspaces",
    accessToken,
    { signal },
  )
  return payload.workspaces
}

export async function createWorkspace(
  organizationId: string,
  accessToken: string,
  input: Pick<Workspace, 'name' | 'slug' | 'description'>,
) {
  return request<Workspace>(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/workspaces`,
    accessToken,
    { method: 'POST', body: JSON.stringify(input) },
  )
}

export async function updateWorkspace(
  organizationId: string,
  workspaceId: string,
  accessToken: string,
  input: Pick<Workspace, 'name' | 'slug' | 'description'>,
) {
  return request<Workspace>(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/workspaces/${encodeURIComponent(workspaceId)}`,
    accessToken,
    { method: 'PATCH', body: JSON.stringify(input) },
  )
}

// The current service implements DELETE as a recoverable archive operation.
// A permanent-delete endpoint and dependency preflight are intentionally not
// exposed here until the backend provides both safeguards.
export async function archiveWorkspace(
  organizationId: string,
  workspaceId: string,
  accessToken: string,
) {
  return request<void>(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/workspaces/${encodeURIComponent(workspaceId)}`,
    accessToken,
    { method: 'DELETE' },
  )
}

export async function listWorkspaceMemberships(
  organizationId: string,
  workspaceId: string,
  accessToken: string,
) {
  const payload = await request<{ memberships: WorkspaceMembership[] }>(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/workspaces/${encodeURIComponent(workspaceId)}/memberships`,
    accessToken,
  )
  return payload.memberships
}

export async function upsertWorkspaceMembership(
  organizationId: string,
  workspaceId: string,
  accessToken: string,
  input: { user_id: string; role: WorkspaceRole },
) {
  return request<WorkspaceMembership>(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/workspaces/${encodeURIComponent(workspaceId)}/memberships`,
    accessToken,
    { method: 'POST', body: JSON.stringify(input) },
  )
}

export async function deleteWorkspaceMembership(
  organizationId: string,
  workspaceId: string,
  userId: string,
  accessToken: string,
) {
  return request<void>(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/workspaces/${encodeURIComponent(workspaceId)}/memberships/${encodeURIComponent(userId)}`,
    accessToken,
    { method: 'DELETE' },
  )
}
