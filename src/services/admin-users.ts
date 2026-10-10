import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface AdminConsumer {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
  status?: 'guest' | 'active' | 'suspended' | null
  claimedAt?: string | null
  phoneVerified?: boolean | null
  emailVerified?: boolean | null
  createdVia?: string | null
  createdByOrgId?: string | null
}

export interface CreateAdminConsumerRequest {
  name: string
  email?: string
  phone?: string
  password?: string
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

export function listAdminConsumers(token: string, status?: AdminConsumer['status']) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<{ users?: Array<AdminConsumer | null> | null }>(token, `/api/admin/users${query}`).then((payload) => ({
    users: Array.isArray(payload?.users)
      ? payload.users.filter((user): user is AdminConsumer => Boolean(user && typeof user === 'object' && typeof user.id === 'string' && user.id)).map((user) => ({
        ...user,
        name: typeof user.name === 'string' && user.name.trim() ? user.name : 'Unnamed user',
      }))
      : [],
  }))
}

export function getAdminConsumer(token: string, id: string) {
  return request<AdminConsumer>(token, `/api/admin/users/${encodeURIComponent(id)}`)
}

export function createAdminConsumer(token: string, input: CreateAdminConsumerRequest) {
  return request<{ id: string }>(token, '/api/admin/users', { method: 'POST', body: JSON.stringify(input) })
}

export function setAdminConsumerStatus(token: string, id: string, status: 'active' | 'suspended') {
  return request<{ id: string; status: AdminConsumer['status'] }>(token, `/api/admin/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  })
}
