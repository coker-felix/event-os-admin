import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface FeatureFlag {
  name: string
  description: string
  defaultEnabled: boolean
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const response = await authenticatedAdminFetch(token, `${adminApiBaseUrl}${path}`, { ...init, headers })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `Request failed (${response.status}).`
    throw new Error(message)
  }
  return payload as T
}

export async function listFeatureFlags(token: string) {
  return request<{ flags: FeatureFlag[] }>(token, '/api/admin/feature-flags')
}

export async function setFeatureFlagDefault(token: string, name: string, enabled: boolean) {
  return request<FeatureFlag>(token, `/api/admin/feature-flags/${encodeURIComponent(name)}`, {
    method: 'PUT', body: JSON.stringify({ enabled }),
  })
}
