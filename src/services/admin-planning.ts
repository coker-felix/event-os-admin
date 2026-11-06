import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface StaffingRule {
  id: string
  role: string
  eventType: string
  serviceStyle: string
  guestsPerStaff: number
  minStaff: number
  active: boolean
}
export interface Holiday {
  date: string
  name: string
}
export interface CalendarRule {
  countryCode: string
  subdivisionCode: string
  weekendDays: number[]
  holidays: Holiday[]
}
export interface PlaybookTask {
  id: string
  title: string
  offset: { amount: number; unit: 'calendar_days' | 'calendar_weeks' | 'business_days' }
  weekendPolicy: 'none' | 'roll_back' | 'roll_forward'
  leadDays: number
  dependsOn: string[]
}
export interface Playbook {
  id: string
  name: string
  version: number
  platform: boolean
  tasks: PlaybookTask[]
}
export interface VenueType {
  code: string
  label: string
}
export interface VenueSpecField {
  code: string
  label: string
  valueType: 'bool' | 'int' | 'decimal' | 'text' | 'enum'
  unit: string
  enumValues: string[]
  appliesToTypes: string[]
}
export interface VenueSpec {
  venueType: string
  fields: Array<{
    code: string
    label: string
    valueType: string
    unit: string
    value: unknown
    source: 'declared' | 'verified'
    updatedAt: number
    stale: boolean
    known: boolean
  }>
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const response = await authenticatedAdminFetch(token, `${adminApiBaseUrl}${path}`, {
    ...init,
    headers,
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const payload = body as { error?: string; message?: string } | null
    const error = new Error(
      payload?.error ?? payload?.message ?? `Request failed (${response.status}).`,
    )
    Object.assign(error, { status: response.status })
    throw error
  }
  return body as T
}
const json = (method: string, value: unknown): RequestInit => ({
  method,
  body: JSON.stringify(value),
})
export const getStaffingRules = (token: string) =>
  request<{ rules?: StaffingRule[] | null }>(token, '/api/admin/staffing-rules')
export const saveStaffingRule = (token: string, value: Omit<StaffingRule, 'id'>, id?: string) =>
  request<StaffingRule>(
    token,
    id ? `/api/admin/staffing-rules/${encodeURIComponent(id)}` : '/api/admin/staffing-rules',
    json(id ? 'PUT' : 'POST', value),
  )
export const getCalendarRules = (token: string) =>
  request<{ rules?: CalendarRule[] | null }>(token, '/api/admin/calendar-rules')
export const saveCalendarRule = (token: string, value: CalendarRule) =>
  request<CalendarRule>(token, '/api/admin/calendar-rules', json('PUT', value))
export const getPlaybooks = (token: string, limit = 10, offset = 0) =>
  request<{ playbooks?: Playbook[] | null; total?: number }>(
    token,
    `/api/admin/playbooks?limit=${limit}&offset=${offset}`,
  )
export const savePlaybook = (token: string, value: Omit<Playbook, 'id' | 'version'>, id?: string) =>
  request<Playbook>(
    token,
    id ? `/api/admin/playbooks/${encodeURIComponent(id)}` : '/api/admin/playbooks',
    json(id ? 'PUT' : 'POST', value),
  )
export const getVenueTypes = (token: string) =>
  request<{ types?: VenueType[] | null }>(token, '/api/admin/venue-types')
export const saveVenueType = (token: string, code: string, label: string) =>
  request<VenueType>(
    token,
    `/api/admin/venue-types/${encodeURIComponent(code)}`,
    json('PUT', { label }),
  )
export const getVenueFields = (token: string) =>
  request<{ fields?: VenueSpecField[] | null }>(token, '/api/admin/venue-spec-fields')
export const saveVenueField = (token: string, value: Omit<VenueSpecField, 'code'>, code: string) =>
  request<VenueSpecField>(
    token,
    `/api/admin/venue-spec-fields/${encodeURIComponent(code)}`,
    json('PUT', value),
  )
export const getVenueSpecs = (token: string, venueId: string) =>
  request<VenueSpec>(token, `/api/admin/venues/${encodeURIComponent(venueId)}/specs`)
export type VenueSpecValue = VenueSpec['fields'][number]
export const verifyVenueSpec = (token: string, venueId: string, fieldCode: string) =>
  request<VenueSpecValue>(
    token,
    `/api/admin/venues/${encodeURIComponent(venueId)}/specs/${encodeURIComponent(fieldCode)}/verify`,
    json('PUT', {}),
  )
