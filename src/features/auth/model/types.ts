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

export type CurrentUserResponse = {
  user: AuthUser
}

export type AuthSession = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated'

