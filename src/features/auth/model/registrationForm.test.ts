import { describe, expect, it } from 'vitest'
import {
  suggestOrganizationSlug,
  validateAdminStep,
  validateOrganizationStep,
  type RegistrationDraft,
} from './registrationForm'

const validDraft: RegistrationDraft = {
  organizationName: 'Axiom Research',
  organizationSlug: 'axiom-research',
  adminDisplayName: 'Admin User',
  adminEmail: 'admin@example.com',
  adminPassword: 'password',
  confirmPassword: 'password',
}

describe('registration form model', () => {
  it('creates a compact lowercase slug suggestion from an organization name', () => {
    expect(suggestOrganizationSlug('  Viện Nghiên cứu & AI  ')).toBe('vien-nghien-cuu-ai')
  })

  it('validates normalized organization fields against the backend limits', () => {
    expect(validateOrganizationStep({
      ...validDraft,
      organizationName: '   ',
      organizationSlug: ` ${'a'.repeat(129)} `,
    })).toEqual({
      organizationName: 'Enter your organization name.',
      organizationSlug: 'Organization slug must be 128 characters or fewer.',
    })
  })

  it('validates administrator identity and matching passwords', () => {
    expect(validateAdminStep({
      ...validDraft,
      adminDisplayName: '   ',
      adminEmail: 'not-an-email',
      adminPassword: 'short',
      confirmPassword: 'different',
    })).toEqual({
      adminDisplayName: 'Enter the admin display name.',
      adminEmail: 'Enter a valid email address.',
      adminPassword: 'Use at least 8 characters.',
      confirmPassword: 'Passwords do not match.',
    })
  })

  it('accepts values at the documented maximum lengths', () => {
    expect(validateOrganizationStep({
      ...validDraft,
      organizationName: 'a'.repeat(255),
      organizationSlug: 'a'.repeat(128),
    })).toEqual({})
    expect(validateAdminStep({
      ...validDraft,
      adminDisplayName: 'a'.repeat(255),
      adminEmail: `${'a'.repeat(308)}@example.com`,
    })).toEqual({})
  })
})
