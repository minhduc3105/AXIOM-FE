import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthRequestError } from '../model/authErrors'
import { RegisterPage } from './RegisterPage'

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
}))

vi.mock('@/features/auth/model/AuthProvider', () => ({
  useAuth: () => ({ register: mocks.register }),
}))

async function completeOrganizationStep(actor: ReturnType<typeof userEvent.setup>) {
  await actor.type(screen.getByLabelText('Organization name'), 'Axiom Research')
  await actor.click(screen.getByRole('button', { name: 'Continue' }))
}

async function completeAdminStep(actor: ReturnType<typeof userEvent.setup>) {
  await actor.type(screen.getByLabelText('Display name'), 'Admin User')
  await actor.type(screen.getByLabelText('Email'), 'ADMIN@Example.COM')
  await actor.type(screen.getByLabelText('Password'), 'password')
  await actor.type(screen.getByLabelText('Confirm password'), 'password')
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mocks.register.mockReset()
  })

  afterEach(cleanup)

  it('suggests a slug until manual editing and preserves both steps when navigating back', async () => {
    const actor = userEvent.setup()
    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText('Organization name'), {
      target: { value: 'Viện Nghiên cứu AI' },
    })
    expect((screen.getByLabelText('Organization slug') as HTMLInputElement).value).toBe('vien-nghien-cuu-ai')

    fireEvent.change(screen.getByLabelText('Organization slug'), {
      target: { value: 'custom-slug' },
    })
    fireEvent.change(screen.getByLabelText('Organization name'), {
      target: { value: 'Viện Nghiên cứu AI Lab' },
    })
    expect((screen.getByLabelText('Organization slug') as HTMLInputElement).value).toBe('custom-slug')

    await actor.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Admin User' },
    })
    await actor.click(screen.getByRole('button', { name: 'Back' }))

    expect((screen.getByLabelText('Organization name') as HTMLInputElement).value).toBe('Viện Nghiên cứu AI Lab')
    expect((screen.getByLabelText('Organization slug') as HTMLInputElement).value).toBe('custom-slug')

    await actor.click(screen.getByRole('button', { name: 'Continue' }))
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Admin User')
  })

  it('keeps the first step active and focuses its first invalid field', async () => {
    const actor = userEvent.setup()
    render(<RegisterPage />)

    await actor.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Enter your organization name.')).toBeTruthy()
    expect(screen.getByText('Enter an organization slug.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Organization name'))
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
  })

  it('submits once, shows progress, and completes with normalized identity fields', async () => {
    const actor = userEvent.setup()
    const onSuccess = vi.fn()
    let resolveRegister: (() => void) | undefined
    mocks.register.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveRegister = resolve
      }),
    )
    render(<RegisterPage onSuccess={onSuccess} />)
    await completeOrganizationStep(actor)
    await completeAdminStep(actor)

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form')
    fireEvent.submit(form!)
    fireEvent.submit(form!)

    expect(mocks.register).toHaveBeenCalledTimes(1)
    expect(mocks.register).toHaveBeenCalledWith({
      organizationName: 'Axiom Research',
      organizationSlug: 'axiom-research',
      adminDisplayName: 'Admin User',
      adminEmail: 'ADMIN@Example.COM',
      adminPassword: 'password',
    })
    expect(screen.getByRole('button', { name: 'Creating account…' }).hasAttribute('disabled')).toBe(true)

    resolveRegister?.()
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it('returns a slug conflict to step one and focuses the slug without clearing the draft', async () => {
    const actor = userEvent.setup()
    mocks.register.mockRejectedValue(new AuthRequestError({
      kind: 'field',
      code: 'ORGANIZATION_SLUG_EXISTS',
      status: 409,
      field: 'organizationSlug',
      userMessage: 'This organization slug is already in use.',
    }))
    render(<RegisterPage />)
    await completeOrganizationStep(actor)
    await completeAdminStep(actor)

    await actor.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('This organization slug is already in use.')).toBeTruthy()
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Organization slug'))
    expect((screen.getByLabelText('Organization name') as HTMLInputElement).value).toBe('Axiom Research')
  })

  it('keeps an email conflict on step two and exposes the sign-in route', async () => {
    const actor = userEvent.setup()
    const onSignIn = vi.fn()
    mocks.register.mockRejectedValue(new AuthRequestError({
      kind: 'field',
      code: 'USER_EMAIL_EXISTS',
      status: 409,
      field: 'adminEmail',
      userMessage: 'An account already uses this email.',
    }))
    render(<RegisterPage loginHref="/login?returnTo=%2Fdata" onSignIn={onSignIn} />)
    await completeOrganizationStep(actor)
    await completeAdminStep(actor)

    await actor.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('An account already uses this email.')).toBeTruthy()
    expect(screen.getByText('Step 2 of 2')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Email'))

    const signInLink = screen.getByRole('link', { name: 'Sign in instead' })
    expect(signInLink.getAttribute('href')).toBe('/login?returnTo=%2Fdata')
    await actor.click(signInLink)
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })
})
