import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthProvider'

const mocks = vi.hoisted(() => ({
  createOrganization: vi.fn(),
  getCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutWithToken: vi.fn(),
  refreshWithToken: vi.fn(),
  registerOrganization: vi.fn(),
  switchOrganization: vi.fn(),
}))

vi.mock('@/features/auth/api/authApi', () => mocks)

function RegisterProbe() {
  const auth = useAuth()

  return (
    <div>
      <p>{auth.status}</p>
      <p>{auth.user?.email ?? 'no user'}</p>
      <button
        type="button"
        onClick={() => void auth.register({
          organizationName: 'Axiom Lab',
          organizationSlug: 'axiom-lab',
          adminDisplayName: 'Admin User',
          adminEmail: 'admin@example.com',
          adminPassword: 'password',
        })}
      >
        Register
      </button>
    </div>
  )
}

describe('AuthProvider registration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.registerOrganization.mockResolvedValue({
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
    })
  })

  afterEach(cleanup)

  it('establishes the returned session without issuing a second login request', async () => {
    const actor = userEvent.setup()
    render(
      <AuthProvider>
        <RegisterProbe />
      </AuthProvider>,
    )

    await screen.findByText('unauthenticated')
    await actor.click(screen.getByRole('button', { name: 'Register' }))

    await screen.findByText('authenticated')
    expect(screen.getByText('admin@example.com')).toBeTruthy()
    expect(mocks.registerOrganization).toHaveBeenCalledTimes(1)
    expect(mocks.loginWithPassword).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('axiom.auth.session') ?? '{}')).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { email: 'admin@example.com' },
      })
    })
  })
})
