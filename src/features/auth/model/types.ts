export type AuthUser = {
  id: string
  organization_id: string
  email: string
  display_name: string
  status: 'active' | 'disabled'
  org_role: 'org_admin' | 'org_member'
}

export type AuthTokenResponse = {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
  user: AuthUser
}

export type OrganizationSummary = {
  id: string
  slug: string
  display_name: string
  status: string
}

export type OrganizationMembership = {
  organization: OrganizationSummary
  org_role: AuthUser['org_role']
}

export type OrganizationRegistrationResponse = AuthTokenResponse & {
  organization: OrganizationSummary
}

export type RegisterOrganizationInput = {
  organizationName: string
  organizationSlug: string
  adminDisplayName: string
  adminEmail: string
  adminPassword: string
}

export type CreateOrganizationInput = Pick<RegisterOrganizationInput, 'organizationName' | 'organizationSlug'>

export type CreateOrganizationUserInput = {
  displayName: string
  email: string
  password?: string
  orgRole: AuthUser['org_role']
}

export type CurrentUserResponse = {
  user: AuthUser
}

export type AuthSession = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated'

