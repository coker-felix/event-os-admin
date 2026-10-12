import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface SiteConfig {
  siteName?: string
  tagline?: string
  logoUrl?: string
  defaultCurrency?: string
  supportEmail?: string
  supportPhone?: string
  announcement?: string
  updatedAt?: string
  updatedBy?: string
  calloutAllowedCategories?: string[]
}

export interface SupportedCountry { code: string; name: string; enabled: boolean; createdAt?: number; updatedAt?: number }
export interface SupportedSubdivision { code: string; countryCode: string; name: string; enabled: boolean; createdAt?: number; updatedAt?: number }
export interface DistributionChannel { key: string; displayName: string; adapterType: 'website' | 'ussd' | 'whatsapp'; configRef?: string; enabled: boolean; adapterImplemented?: boolean }
export interface EventCategory { id: number; slug: string; name: string; description?: string; active: boolean }

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

export const getSiteConfig = (token: string) => request<SiteConfig>(token, '/api/admin/config')
export const putSiteConfig = (token: string, config: SiteConfig) => request<SiteConfig>(token, '/api/admin/config', { method: 'PUT', body: JSON.stringify(config) })

export const listCountries = (token: string) => request<{ countries?: SupportedCountry[] | null; total?: number }>(token, '/api/admin/countries')
export const createCountry = (token: string, input: { code: string; name: string; enabled: boolean }) => request<SupportedCountry>(token, '/api/admin/countries', { method: 'POST', body: JSON.stringify(input) })
export const updateCountry = (token: string, code: string, input: { name?: string; enabled: boolean }) => request<SupportedCountry>(token, `/api/admin/countries/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify(input) })

export const listSubdivisions = (token: string, country: string) => request<{ subdivisions?: SupportedSubdivision[] | null; total?: number }>(token, `/api/admin/countries/${encodeURIComponent(country)}/subdivisions`)
export const createSubdivision = (token: string, country: string, input: { code: string; name: string; enabled: boolean }) => request<SupportedSubdivision>(token, `/api/admin/countries/${encodeURIComponent(country)}/subdivisions`, { method: 'POST', body: JSON.stringify(input) })
export const updateSubdivision = (token: string, code: string, input: { name?: string; enabled: boolean }) => request<SupportedSubdivision>(token, `/api/admin/subdivisions/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify(input) })

export const listDistributionChannels = (token: string) => request<{ distributionChannels?: DistributionChannel[] | null; total?: number }>(token, '/api/admin/distribution-channels')
export const createDistributionChannel = (token: string, input: { key: string; displayName: string; adapterType: DistributionChannel['adapterType']; configRef?: string; enabled: boolean }) => request<DistributionChannel>(token, '/api/admin/distribution-channels', { method: 'POST', body: JSON.stringify(input) })
export const updateDistributionChannel = (token: string, key: string, input: { displayName?: string; configRef?: string; enabled: boolean }) => request<DistributionChannel>(token, `/api/admin/distribution-channels/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify(input) })

export const listEventCategories = (token: string) => request<{ categories?: EventCategory[] | null; total?: number }>(token, '/api/admin/event-categories')
export const createEventCategory = (token: string, input: { name: string; description?: string }) => request<EventCategory>(token, '/api/admin/event-categories', { method: 'POST', body: JSON.stringify(input) })
export const updateEventCategory = (token: string, id: number, input: { name?: string; description?: string; active: boolean }) => request<EventCategory>(token, `/api/admin/event-categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
