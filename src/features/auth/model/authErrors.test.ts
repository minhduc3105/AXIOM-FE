import { describe, expect, it } from 'vitest'
import {
  AuthRequestError,
  createAuthTransportError,
  parseAuthErrorResponse,
} from './authErrors'

describe('auth error normalization', () => {
  it('maps a nested email-conflict envelope to the admin email field', async () => {
    const cause = await parseAuthErrorResponse(
      new Response(
        JSON.stringify({
          detail: {
            code: 'USER_EMAIL_EXISTS',
            message: 'User email already exists.',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
      'registration',
    )

    expect(cause).toBeInstanceOf(AuthRequestError)
    expect(cause.details).toEqual({
      kind: 'field',
      code: 'USER_EMAIL_EXISTS',
      status: 409,
      field: 'adminEmail',
      userMessage: 'An account already uses this email.',
    })
  })

  it('uses the generic credentials message for a malformed login 401 response', async () => {
    const cause = await parseAuthErrorResponse(
      new Response('<html>not authorized</html>', {
        status: 401,
        headers: { 'Content-Type': 'text/html' },
      }),
      'login',
    )

    expect(cause.details).toEqual({
      kind: 'credentials',
      code: null,
      status: 401,
      field: null,
      userMessage: "We couldn't sign you in. Check your details and try again.",
    })
  })

  it('does not expose an unknown server response in the fallback message', async () => {
    const cause = await parseAuthErrorResponse(
      new Response('internal trace: database password', { status: 500 }),
      'registration',
    )

    expect(cause.details.userMessage).toBe('Something went wrong. Try again in a moment.')
    expect(cause.message).not.toContain('database password')
  })

  it('classifies a fetch TypeError as a connection failure', () => {
    const cause = createAuthTransportError(new TypeError('Failed to fetch'), 'login')

    expect(cause.details).toEqual({
      kind: 'network',
      code: null,
      status: null,
      field: null,
      userMessage: "We couldn't reach AXIOM Auth. Check your connection and try again.",
    })
  })
})
