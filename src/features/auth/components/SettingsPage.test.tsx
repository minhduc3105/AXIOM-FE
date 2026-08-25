import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'

const authState = vi.hoisted(() => ({
  changePassword: vi.fn(),
  user: {
    id: 'user-1',
    organization_id: 'org-1',
    email: 'admin@example.com',
    display_name: 'Admin User',
    status: 'active' as const,
    org_role: 'org_admin' as const,
  },
}))

const themeState = vi.hoisted(() => ({
  theme: 'light' as const,
  resolvedTheme: 'light' as const,
  setTheme: vi.fn(),
}))

vi.mock('@/features/auth/model/AuthProvider', () => ({
  useAuth: () => authState,
}))

vi.mock('@/app/ThemeProvider', () => ({
  useTheme: () => themeState,
}))

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('starts with account settings instead of repeating the global Settings title', () => {
    render(<SettingsPage />)

    expect(screen.queryByRole('heading', { name: 'Settings', level: 1 })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Personal profile', level: 2 })).toBeTruthy()
  })

  it('keeps a mismatched password confirmation in Settings without submitting', async () => {
    const actor = userEvent.setup()
    render(<SettingsPage />)

    await actor.type(screen.getByLabelText('Current password'), 'current-password')
    await actor.type(screen.getByLabelText('New password'), 'new-password')
    await actor.type(screen.getByLabelText('Confirm new password'), 'different-password')
    await actor.click(screen.getByRole('button', { name: 'Update password' }))

    expect(screen.getByText('Passwords do not match.')).toBeTruthy()
    expect(authState.changePassword).not.toHaveBeenCalled()
  })

  it('updates the password from Settings and clears the sensitive form values', async () => {
    const actor = userEvent.setup()
    authState.changePassword.mockResolvedValue(undefined)
    render(<SettingsPage />)

    await actor.type(screen.getByLabelText('Current password'), 'current-password')
    await actor.type(screen.getByLabelText('New password'), 'new-password')
    await actor.type(screen.getByLabelText('Confirm new password'), 'new-password')
    await actor.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => {
      expect(authState.changePassword).toHaveBeenCalledWith('current-password', 'new-password')
    })
    expect(screen.getByText('Password updated.')).toBeTruthy()
    expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('New password') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Confirm new password') as HTMLInputElement).value).toBe('')
  })
})
