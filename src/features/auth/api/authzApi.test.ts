import { afterEach, describe, expect, it, vi } from 'vitest'
import { listWorkspaces } from '@/features/auth/api/authzApi'

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
    expect(fetchMock).toHaveBeenCalledWith(
      '/authz-service/api/v1/orgs/org-1/workspaces',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-1' }),
      }),
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
})
