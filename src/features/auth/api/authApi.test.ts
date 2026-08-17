import { afterEach, describe, expect, it, vi } from 'vitest'
import { loginWithPassword } from './authApi'

describe('loginWithPassword', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('turns an unavailable Auth service response into a typed safe error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('stack trace: database password', { status: 503 }),
      ),
    )

    await expect(loginWithPassword('admin@example.com', 'secret')).rejects.toMatchObject({
      name: 'AuthRequestError',
      details: {
        kind: 'service',
        status: 503,
        userMessage: 'AXIOM Auth is temporarily unavailable. Try again in a moment.',
      },
    })
  })

  it('turns a failed network request into a typed connection error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(loginWithPassword('admin@example.com', 'secret')).rejects.toMatchObject({
      name: 'AuthRequestError',
      details: {
        kind: 'network',
        status: null,
        userMessage: "We couldn't reach AXIOM Auth. Check your connection and try again.",
      },
    })
  })
})
