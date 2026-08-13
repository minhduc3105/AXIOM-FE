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
  const response = await fetch(`${authzApiBaseUrl}${path}`, {
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
    throw new Error(detail || `Authorization service request failed (${response.status}).`)
  }
  if (response.status === 204) return undefined as T
  return parseJsonResponse<T>(response)
}

export async function listWorkspaces(organizationId: string, accessToken: string) {
  const payload = await request<{ workspaces: Workspace[] }>(
    `/api/v1/orgs/${encodeURIComponent(organizationId)}/workspaces`,
    accessToken,
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
