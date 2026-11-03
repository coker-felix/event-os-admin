import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface VendorServiceCatalogEntry {
  id: string
  kind: string
  name: string
  description?: string | null
  enabled: boolean
  sortOrder?: number | null
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

export async function listVendorServiceCatalog(token: string, includeDisabled = false) {
  const query = includeDisabled ? '?includeDisabled=true' : ''
  const response = await request<{ services?: Array<VendorServiceCatalogEntry | null> | null }>(token, `/api/admin/vendor-service-catalog${query}`)
  return { services: Array.isArray(response?.services) ? response.services.filter((service): service is VendorServiceCatalogEntry => Boolean(service?.kind)) : [] }
}

export function createVendorServiceCatalogEntry(token: string, input: { kind: string; name: string; description: string; sortOrder: number }) {
  return request<VendorServiceCatalogEntry>(token, '/api/admin/vendor-service-catalog', { method: 'POST', body: JSON.stringify(input) })
}

export function updateVendorServiceCatalogEntry(token: string, kind: string, input: { name: string; description: string; enabled: boolean; sortOrder: number }) {
  return request<VendorServiceCatalogEntry>(token, `/api/admin/vendor-service-catalog/${encodeURIComponent(kind)}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function disableVendorServiceCatalogEntry(token: string, kind: string) {
  return request<VendorServiceCatalogEntry>(token, `/api/admin/vendor-service-catalog/${encodeURIComponent(kind)}`, { method: 'DELETE' })
}
