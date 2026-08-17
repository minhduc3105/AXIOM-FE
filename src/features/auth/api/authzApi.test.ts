import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  archiveWorkspace,
  listMyWorkspaces,
  listWorkspaces,
  updateWorkspace,
} from '@/features/auth/api/authzApi'

describe('authzApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads workspaces through the authz gateway route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ workspaces: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(listWorkspaces('org-1', 'token-1')).resolves.toEqual([])
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/authz-service/api/v1/orgs/org-1/workspaces',
    )
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer token-1',
    )
  })

  it('uses the deployed organization route for the current user workspaces', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ workspaces: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(listMyWorkspaces('org-1', 'token-1')).resolves.toEqual([])
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/authz-service/api/v1/orgs/org-1/workspaces',
    )
  })

  it('reports a gateway configuration error when Vite returns the app HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<!doctype html><html></html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )

    await expect(listWorkspaces('org-1', 'token-1')).rejects.toThrow(
      'Authorization service returned an unexpected non-JSON response',
    )
  })

  it('updates workspace details through the organization workspace route', async () => {
    const workspace = {
      id: 'workspace-1', organization_id: 'org-1', name: 'Research', slug: 'research',
      description: 'Research work', status: 'active', is_default: false,
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(workspace), { headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateWorkspace('org-1', 'workspace-1', 'token-1', {
      name: 'Research', slug: 'research', description: 'Research work',
    })).resolves.toEqual(workspace)
    expect(fetchMock).toHaveBeenCalledWith(
      '/authz-service/api/v1/orgs/org-1/workspaces/workspace-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Research', slug: 'research', description: 'Research work' }) }),
    )
  })

  it('archives a workspace through the recoverable delete endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(archiveWorkspace('org-1', 'workspace-1', 'token-1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      '/authz-service/api/v1/orgs/org-1/workspaces/workspace-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
