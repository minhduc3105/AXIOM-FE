import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthRequestError } from '../model/authErrors'
import { LoginPage } from './LoginPage'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
}))

vi.mock('@/features/auth/model/AuthProvider', () => ({
  useAuth: () => ({ login: mocks.login }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mocks.login.mockReset()
  })

  afterEach(cleanup)

  it('submits a trimmed, lowercase email without transforming the password', async () => {
    const actor = userEvent.setup()
    mocks.login.mockResolvedValue(undefined)
    render(<LoginPage />)

    await actor.clear(screen.getByLabelText('Email'))
    await actor.type(screen.getByLabelText('Email'), ' ADMIN@Example.COM ')
    await actor.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith('admin@example.com', 'password')
    })
  })

  it('clears a stale credentials alert when either credential changes', async () => {
    const actor = userEvent.setup()
    mocks.login.mockRejectedValue(
      new AuthRequestError({
        kind: 'credentials',
        code: 'INVALID_CREDENTIALS',
        status: 401,
        field: null,
        userMessage: "We couldn't sign you in. Check your details and try again.",
      }),
    )
    render(<LoginPage />)

    await actor.click(screen.getByRole('button', { name: 'Sign in' }))
    expect((await screen.findByRole('alert')).textContent).toContain("We couldn't sign you in")

    await actor.type(screen.getByLabelText('Email'), 'x')

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('uses the shared password visibility control without showing a credential callout', () => {
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy()
    expect(screen.queryByText(/Default local account/)).toBeNull()
  })

  it('blocks duplicate submissions while the login request is pending', async () => {
    let resolveLogin: (() => void) | undefined
    mocks.login.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveLogin = resolve
      }),
    )
    render(<LoginPage />)

    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form')
    expect(form).not.toBeNull()

    fireEvent.submit(form!)
    fireEvent.submit(form!)

    expect(mocks.login).toHaveBeenCalledTimes(1)
    expect(form?.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('button', { name: 'Signing in…' }).hasAttribute('disabled')).toBe(true)

    resolveLogin?.()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' }).hasAttribute('disabled')).toBe(false)
    })
  })
})
