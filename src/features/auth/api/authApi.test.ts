import { afterEach, describe, expect, it, vi } from 'vitest'
import { loginWithPassword, registerOrganization } from './authApi'

describe('loginWithPassword', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('turns an unavailable Auth service response into a typed safe error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('stack trace: database password', { status: 503 }),
      ),
    )

    await expect(loginWithPassword('admin@example.com', 'secret')).rejects.toMatchObject({
      name: 'AuthRequestError',
      details: {
        kind: 'service',
        status: 503,
        userMessage: 'AXIOM Auth is temporarily unavailable. Try again in a moment.',
      },
    })
  })

  it('turns a failed network request into a typed connection error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(loginWithPassword('admin@example.com', 'secret')).rejects.toMatchObject({
      name: 'AuthRequestError',
      details: {
        kind: 'network',
        status: null,
        userMessage: "We couldn't reach AXIOM Auth. Check your connection and try again.",
      },
    })
  })

  it('preserves an Error-shaped AbortError instead of presenting a connection failure', async () => {
    const abortError = new Error('The operation was aborted.')
    abortError.name = 'AbortError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(loginWithPassword('admin@example.com', 'secret')).rejects.toBe(abortError)
  })
})

describe('registerOrganization', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('normalizes registration fields while preserving the password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
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
        organization: {
          id: 'org-1',
          slug: 'axiom-lab',
          display_name: 'Axiom Lab',
          status: 'active',
        },
      }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await registerOrganization({
      organizationName: '  Axiom Lab  ',
      organizationSlug: '  AXIOM-LAB  ',
      adminDisplayName: '  Admin User  ',
      adminEmail: '  ADMIN@Example.COM  ',
      adminPassword: ' Password ',
    })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(request.body))).toEqual({
      organization_name: 'Axiom Lab',
      organization_slug: 'axiom-lab',
      admin_display_name: 'Admin User',
      admin_email: 'admin@example.com',
      admin_password: ' Password ',
    })
  })
})
