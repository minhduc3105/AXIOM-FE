import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRouter } from './AppRouter'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  navigatePath: vi.fn(),
  register: vi.fn(),
}))

vi.mock('@/features/auth/model/AuthProvider', () => ({
  useAuth: () => ({
    status: 'unauthenticated',
    user: null,
    accessToken: null,
    restoreError: null,
    sessionEndReason: null,
    login: vi.fn(),
    register: mocks.register,
    createOrganization: vi.fn(),
    switchOrganization: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    retryRestore: vi.fn(),
  }),
}))

vi.mock('./routing/useBrowserRoute', () => ({
  useBrowserRoute: () => ({
    route: {
      kind: 'auth',
      page: 'register',
      returnTo: '/data',
      reason: null,
    },
    path: '/register?returnTo=%2Fdata',
    navigate: mocks.navigate,
    navigatePath: mocks.navigatePath,
  }),
}))

describe('AppRouter registration route', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
  })

  afterEach(cleanup)

  it('renders registration and preserves returnTo when navigating to sign in', async () => {
    const actor = userEvent.setup()
    render(<AppRouter renderApp={() => null} />)

    expect(screen.getByRole('heading', { name: 'Set up your organization' })).toBeTruthy()
    const signInLink = screen.getByRole('link', { name: 'Sign in instead' })
    expect(signInLink.getAttribute('href')).toBe('/login?returnTo=%2Fdata')

    await actor.click(signInLink)
    expect(mocks.navigate).toHaveBeenCalledWith({
      kind: 'auth',
      page: 'login',
      returnTo: '/data',
      reason: null,
    })
  })
})
