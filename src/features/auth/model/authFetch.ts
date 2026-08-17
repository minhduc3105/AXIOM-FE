type AuthFetchConfig = {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<boolean>
  onUnauthorized: () => void
}

let config: AuthFetchConfig = {
  getAccessToken: () => null,
  refreshAccessToken: async () => false,
  onUnauthorized: () => undefined,
}

export function configureAuthFetch(nextConfig: AuthFetchConfig) {
  config = nextConfig
}

function requestWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
  replaceAuthorization = false,
) {
  const token = config.getAccessToken()
  const headers = new Headers(init.headers)
  if (token && (replaceAuthorization || !headers.has('Authorization'))) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(input, { ...init, headers })
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const response = await requestWithAuth(input, init)
  if (response.status !== 401) return response

  const refreshed = await config.refreshAccessToken()
  if (!refreshed) {
    config.onUnauthorized()
    return response
  }

  return requestWithAuth(input, init, true)
}

