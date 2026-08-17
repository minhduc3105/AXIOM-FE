import type { AuthError, AuthErrorKind, AuthField } from './types'

export type AuthErrorOperation = 'login' | 'registration' | 'session' | 'organization'

type ErrorDetails = {
  code: string | null
  status: number | null
  operation: AuthErrorOperation
}

const sessionCodes = new Set([
  'TOKEN_EXPIRED',
  'SESSION_REVOKED',
  'INVALID_REFRESH_TOKEN',
  'INVALID_TOKEN',
])

export class AuthRequestError extends Error {
  readonly details: AuthError

  constructor(details: AuthError) {
    super(details.userMessage)
    this.name = 'AuthRequestError'
    this.details = details
  }
}

function createError(
  kind: AuthErrorKind,
  code: string | null,
  status: number | null,
  field: AuthField,
  userMessage: string,
) {
  return new AuthRequestError({ kind, code, status, field, userMessage })
}

function readCode(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null

  const source = 'detail' in payload && typeof payload.detail === 'object' && payload.detail !== null
    ? payload.detail
    : payload

  return 'code' in source && typeof source.code === 'string' ? source.code : null
}

function mapAuthError({ code, status, operation }: ErrorDetails): AuthRequestError {
  if (code === 'ORGANIZATION_SLUG_EXISTS') {
    return createError('field', code, status, 'organizationSlug', 'This organization slug is already in use.')
  }

  if (code === 'USER_EMAIL_EXISTS') {
    return createError('field', code, status, 'adminEmail', 'An account already uses this email.')
  }

  if (code === 'ORGANIZATION_REGISTRATION_CONFLICT') {
    return createError('account', code, status, null, 'Review the organization slug and email, then try again.')
  }

  if (code === 'INVALID_CREDENTIALS' || (operation === 'login' && status === 401)) {
    return createError('credentials', code, status, null, "We couldn't sign you in. Check your details and try again.")
  }

  if (code === 'USER_DISABLED') {
    return createError('account', code, status, null, 'This account is unavailable. Contact your organization administrator.')
  }

  if (sessionCodes.has(code ?? '') || (operation === 'session' && status === 401)) {
    return createError('session', code, status, null, 'Your session expired. Sign in again to continue.')
  }

  if (status === 502 || status === 503 || status === 504) {
    return createError('service', code, status, null, 'AXIOM Auth is temporarily unavailable. Try again in a moment.')
  }

  return createError('unknown', code, status, null, 'Something went wrong. Try again in a moment.')
}

export async function parseAuthErrorResponse(
  response: Response,
  operation: AuthErrorOperation,
): Promise<AuthRequestError> {
  const body = (await response.text()).trim()
  let payload: unknown = null

  if (body) {
    try {
      payload = JSON.parse(body)
    } catch {
      // Raw responses are intentionally never exposed to the UI.
    }
  }

  return mapAuthError({ code: readCode(payload), status: response.status, operation })
}

export function createAuthTransportError(
  _cause: unknown,
  operation: AuthErrorOperation,
): AuthRequestError {
  return createError(
    'network',
    null,
    null,
    null,
    "We couldn't reach AXIOM Auth. Check your connection and try again.",
  )
}

export function getAuthError(cause: unknown, operation: AuthErrorOperation): AuthError {
  if (cause instanceof AuthRequestError) return cause.details
  return mapAuthError({ code: null, status: null, operation }).details
}
