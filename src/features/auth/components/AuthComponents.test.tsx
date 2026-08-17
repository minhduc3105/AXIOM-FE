import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthFormField } from './AuthFormField'
import { AuthShell } from './AuthShell'
import { PasswordField } from './PasswordField'

describe('shared Auth components', () => {
  afterEach(cleanup)

  it('keeps AXIOM access context around route-owned form content', () => {
    render(
      <AuthShell>
        <h1>Sign in to AXIOM</h1>
      </AuthShell>,
    )

    expect(screen.getAllByText('Intelligence Console')).toHaveLength(2)
    expect(screen.getByText('Organization-scoped access')).toBeTruthy()
    expect(screen.getByText("Work within your organization's intelligence workspace.")).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sign in to AXIOM' })).toBeTruthy()
  })

  it('associates its server error with the input it owns', () => {
    render(
      <AuthFormField
        id="admin-email"
        label="Email"
        value="admin@example.com"
        error="An account already uses this email."
        onChange={() => undefined}
      />,
    )

    const input = screen.getByLabelText('Email')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('admin-email-error')
    expect(screen.getByRole('alert').textContent).toContain('An account already uses this email.')
  })

  it('reveals a password without losing the active value or selection', async () => {
    const actor = userEvent.setup()
    render(
      <PasswordField
        id="login-password"
        label="Password"
        value="password"
        onChange={() => undefined}
      />,
    )

    const input = screen.getByLabelText('Password') as HTMLInputElement
    input.focus()
    input.setSelectionRange(2, 6)

    await actor.click(screen.getByRole('button', { name: 'Show password' }))

    expect(input.type).toBe('text')
    expect(input.value).toBe('password')
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(2)
    expect(input.selectionEnd).toBe(6)
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy()
  })
})
