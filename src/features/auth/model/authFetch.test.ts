import { afterEach, describe, expect, it, vi } from 'vitest'
import { authFetch, configureAuthFetch } from '@/features/auth/model/authFetch'

describe('authFetch', () => {
  afterEach(() => {
    configureAuthFetch({
      getAccessToken: () => null,
      refreshAccessToken: async () => false,
      onUnauthorized: () => undefined,
    })
    vi.unstubAllGlobals()
  })

  it('retries a request with the refreshed access token after a 401 response', async () => {
    let token = 'expired-token'
    const refreshAccessToken = vi.fn(async () => {
      token = 'fresh-token'
      return true
    })
    configureAuthFetch({
      getAccessToken: () => token,
      refreshAccessToken,
      onUnauthorized: () => undefined,
    })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Bearer token is invalid' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(authFetch('/authz-service/workspaces', {
      method: 'DELETE', headers: { Authorization: 'Bearer expired-token' },
    })).resolves.toMatchObject({ status: 204 })

    expect(refreshAccessToken).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ get: expect.any(Function) }),
    }))
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe('Bearer fresh-token')
  })
})
