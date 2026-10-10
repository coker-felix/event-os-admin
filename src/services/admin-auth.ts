export interface AdminLoginRequest {
  email: string
  password: string
}

export interface AuthSession {
  /** Current access token. Kept as `token` for existing API consumers. */
  token: string
  refreshToken?: string
  tokenType?: 'Bearer'
  accessExpiresAt?: number
  refreshExpiresAt?: number
}

interface AdminTokenPairResponse {
  token?: unknown
  access_token?: unknown
  refresh_token?: unknown
  token_type?: unknown
  expires_in?: unknown
  refresh_expires_in?: unknown
}

export const ADMIN_SESSION_KEY = 'event-os-admin-session'
export const ADMIN_SESSION_CHANGE_EVENT = 'event-os-admin-session-change'
export const adminApiBaseUrl = (import.meta.env.VITE_ADMIN_API_BASE_URL || '').replace(/\/$/, '')

class AdminAuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'AdminAuthError'
  }
}

function decodeTokenPair(payload: unknown): AuthSession {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The authentication response did not include a valid token pair.')
  }
  const pair = payload as AdminTokenPairResponse
  const accessToken = typeof pair.access_token === 'string' && pair.access_token
    ? pair.access_token
    : typeof pair.token === 'string' && pair.token ? pair.token : ''
  if (!accessToken) throw new Error('The authentication response did not include a valid access token.')

  const expiresIn = typeof pair.expires_in === 'number' && Number.isFinite(pair.expires_in) ? pair.expires_in : undefined
  const refreshExpiresIn = typeof pair.refresh_expires_in === 'number' && Number.isFinite(pair.refresh_expires_in) ? pair.refresh_expires_in : undefined
  return {
    token: accessToken,
    ...(typeof pair.refresh_token === 'string' && pair.refresh_token ? { refreshToken: pair.refresh_token } : {}),
    tokenType: 'Bearer',
    ...(expiresIn !== undefined ? { accessExpiresAt: Date.now() + expiresIn * 1000 } : {}),
    ...(refreshExpiresIn !== undefined ? { refreshExpiresAt: Date.now() + refreshExpiresIn * 1000 } : {}),
  }
}

function responseError(payload: unknown, fallback: string) {
  if (typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string') return payload.error
  if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') return payload.message
  return fallback
}

export function readStoredAdminSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  const stored = window.sessionStorage.getItem(ADMIN_SESSION_KEY)
  if (!stored) return null
  try {
    const value: unknown = JSON.parse(stored)
    if (typeof value !== 'object' || value === null || !('token' in value) || typeof value.token !== 'string' || !value.token) {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
      return null
    }
    const record = value as Record<string, unknown>
    return {
      token: value.token,
      ...(typeof record.refreshToken === 'string' && record.refreshToken ? { refreshToken: record.refreshToken } : {}),
      tokenType: 'Bearer',
      ...(typeof record.accessExpiresAt === 'number' ? { accessExpiresAt: record.accessExpiresAt } : {}),
      ...(typeof record.refreshExpiresAt === 'number' ? { refreshExpiresAt: record.refreshExpiresAt } : {}),
    }
  } catch {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
    return null
  }
}

export function storeAdminSession(session: AuthSession) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT))
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT))
}

async function readTokenPairResponse(response: Response, fallback: string): Promise<AuthSession> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new AdminAuthError(responseError(payload, fallback), response.status)
  return decodeTokenPair(payload)
}

export async function loginAdmin(credentials: AdminLoginRequest): Promise<AuthSession> {
  const response = await fetch(`${adminApiBaseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  return readTokenPairResponse(response, 'Unable to sign in. Check your credentials and try again.')
}

let refreshInFlight: Promise<AuthSession> | null = null

function refreshAdminSession(refreshToken: string): Promise<AuthSession> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(`${adminApiBaseUrl}/api/admin/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      const session = await readTokenPairResponse(response, 'Your admin session has expired. Sign in again.')
      if (!session.refreshToken) throw new Error('The refresh response did not include a refresh token.')
      storeAdminSession(session)
      return session
    })().finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

function withBearer(headers: Headers, token: string) {
  headers.set('Authorization', `Bearer ${token}`)
}

export async function authenticatedAdminFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  let session = readStoredAdminSession()
  if (session?.refreshToken && session.refreshExpiresAt && session.refreshExpiresAt <= Date.now()) {
    clearAdminSession()
    throw new AdminAuthError('Your admin session has expired. Sign in again.', 401)
  }
  if (session?.refreshToken && session.accessExpiresAt && session.accessExpiresAt <= Date.now() + 30_000) {
    try {
      session = await refreshAdminSession(session.refreshToken)
    } catch (cause) {
      if (cause instanceof AdminAuthError && cause.status === 401) clearAdminSession()
      throw cause
    }
  }

  const send = (accessToken: string) => {
    const headers = new Headers(init.headers)
    withBearer(headers, accessToken)
    return fetch(url, { ...init, headers })
  }
  const response = await send(session?.token ?? token)
  if (response.status !== 401) return response
  if (!session?.refreshToken) {
    clearAdminSession()
    return response
  }

  try {
    const refreshed = await refreshAdminSession(session.refreshToken)
    const retry = await send(refreshed.token)
    if (retry.status === 401) clearAdminSession()
    return retry
  } catch (cause) {
    if (cause instanceof AdminAuthError && cause.status === 401) clearAdminSession()
    throw cause
  }
}
