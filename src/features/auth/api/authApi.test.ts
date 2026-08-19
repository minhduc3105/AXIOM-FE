import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from './authApi'
import type { AuthTokenResponse } from '@/features/auth/model/types'

const fetchMock = vi.fn()

const tokenResponse: AuthTokenResponse = {
  access_token: 'replacement-access-token',
  refresh_token: 'replacement-refresh-token',
  token_type: 'bearer',
  expires_in: 900,
  user: {
    id: 'user-1',
    organization_id: 'org-1',
    email: 'admin@example.com',
    display_name: 'Admin User',
    status: 'active',
    org_role: 'org_admin',
  },
}

describe('changePassword', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(JSON.stringify(tokenResponse), { status: 200 }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('sends the current password and receives a replacement token pair', async () => {
    const changePassword = (authApi as typeof authApi & {
      changePassword: (
        currentPassword: string,
        newPassword: string,
        accessToken: string,
      ) => Promise<AuthTokenResponse>
    }).changePassword

    await expect(
      changePassword('current-password', 'new-password', 'access-token'),
    ).resolves.toEqual(tokenResponse)

    expect(fetchMock).toHaveBeenCalledWith(
      '/auth-service/api/v1/auth/password',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: 'current-password',
          new_password: 'new-password',
        }),
      }),
    )
  })
})
