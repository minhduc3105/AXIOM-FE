export type AuthRefreshResult = "refreshed" | "expired" | "unavailable"

type AuthFetchConfig = {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<AuthRefreshResult>
  onUnauthorized: () => void
}

let config: AuthFetchConfig = {
  getAccessToken: () => null,
  refreshAccessToken: async () => "expired",
  onUnauthorized: () => undefined,
}

let refreshPromise: Promise<AuthRefreshResult> | null = null
let unauthorizedSignaled = false

export function configureAuthFetch(nextConfig: AuthFetchConfig) {
  config = nextConfig
  refreshPromise = null
  unauthorizedSignaled = false
}

export function resetAuthFetchUnauthorizedState() {
  unauthorizedSignaled = false
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

  const startsRefresh = !refreshPromise
  if (startsRefresh) {
    refreshPromise = config.refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  const refreshResult = await refreshPromise
  if (refreshResult === "expired") {
    if (startsRefresh && !unauthorizedSignaled) {
      unauthorizedSignaled = true
      config.onUnauthorized()
    }
    return response
  }
  if (refreshResult === "unavailable") return response

  return requestWithAuth(input, init, true)
}
