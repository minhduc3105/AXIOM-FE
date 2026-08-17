export type RegistrationDraft = {
  organizationName: string
  organizationSlug: string
  adminDisplayName: string
  adminEmail: string
  adminPassword: string
  confirmPassword: string
}

export type RegistrationField = keyof RegistrationDraft
export type RegistrationFieldErrors = Partial<Record<RegistrationField, string>>

const emailPattern = /^[^\s@]+@[^\s@]+$/

export function suggestOrganizationSlug(organizationName: string) {
  return organizationName
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128)
}

export function validateOrganizationStep(draft: RegistrationDraft): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {}
  const organizationName = draft.organizationName.trim()
  const organizationSlug = draft.organizationSlug.trim().toLowerCase()

  if (!organizationName) {
    errors.organizationName = 'Enter your organization name.'
  } else if (organizationName.length > 255) {
    errors.organizationName = 'Organization name must be 255 characters or fewer.'
  }

  if (!organizationSlug) {
    errors.organizationSlug = 'Enter an organization slug.'
  } else if (organizationSlug.length > 128) {
    errors.organizationSlug = 'Organization slug must be 128 characters or fewer.'
  }

  return errors
}

export function validateAdminStep(draft: RegistrationDraft): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {}
  const adminDisplayName = draft.adminDisplayName.trim()
  const adminEmail = draft.adminEmail.trim().toLowerCase()

  if (!adminDisplayName) {
    errors.adminDisplayName = 'Enter the admin display name.'
  } else if (adminDisplayName.length > 255) {
    errors.adminDisplayName = 'Display name must be 255 characters or fewer.'
  }

  if (!adminEmail) {
    errors.adminEmail = 'Enter the admin email address.'
  } else if (adminEmail.length > 320) {
    errors.adminEmail = 'Email must be 320 characters or fewer.'
  } else if (!emailPattern.test(adminEmail)) {
    errors.adminEmail = 'Enter a valid email address.'
  }

  if (draft.adminPassword.length < 8) {
    errors.adminPassword = 'Use at least 8 characters.'
  }

  if (!draft.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (draft.confirmPassword !== draft.adminPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}
