import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

type UnixSeconds = number | string
type Int64Value = number | string

export interface AdminEvent {
  id: string
  orgId?: string | null
  title?: string | null
  description?: string | null
  venueId?: string | null
  startsAt?: UnixSeconds | null
  endsAt?: UnixSeconds | null
  currency?: string | null
  status?: 'draft' | 'published' | 'cancelled' | 'completed' | string | null
  visibility?: 'public' | 'private' | string | null
  categoryId?: number | null
  attendanceType?: string | null
  countryCode?: string | null
  subdivisionCode?: string | null
  timezone?: string | null
  customSlug?: string | null
  tags?: Array<string | null> | null
  createdAt?: UnixSeconds | null
  updatedAt?: UnixSeconds | null
}

export interface AdminTicketType {
  id: string
  eventId?: string | null
  name?: string | null
  priceMinor?: Int64Value | null
  total?: Int64Value | null
  sold?: Int64Value | null
  status?: string | null
  saleStartAt?: UnixSeconds | null
  saleEndAt?: UnixSeconds | null
}

export interface AdminOrder {
  id: string
  userId?: string | null
  eventId?: string | null
  orgId?: string | null
  status?: string | null
  total?: Int64Value | null
  currency?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  createdAt?: UnixSeconds | null
  lines?: Array<Record<string, unknown> | null> | null
}

export interface AdminEventInput {
  title: string
  description?: string
  venueId?: string
  startsAt: number
  endsAt: number
  categoryId?: number
  attendanceType?: string
  countryCode?: string
  subdivisionCode?: string
  timezone?: string
  customSlug?: string
  tags?: string[]
}

export interface AdminTicketTypeInput {
  name: string
  priceMinor: number
  total: number
  saleStartAt?: number
  saleEndAt?: number
  status?: string
}

export interface PublicEvent {
  id: string
  title?: string | null
  description?: string | null
  venueId?: string | null
  startsAt?: string | number | null
  endsAt?: string | number | null
  status?: string | null
  visibility?: string | null
  category?: string | null
  categoryId?: number | null
  attendanceType?: string | null
  countryCode?: string | null
  timezone?: string | null
  customSlug?: string | null
  tags?: Array<string | null> | null
}

export interface PublicTicketType {
  id: string
  name?: string | null
  available?: string | number | null
  supplyKind?: string | null
  admissionsPerUnit?: string | number | null
}

export interface PublicEventDetails {
  event?: PublicEvent | null
  ticketTypes?: Array<PublicTicketType | null> | null
}

export interface TicketVerificationResult {
  valid?: boolean | null
  reason?: string | null
  event?: { id?: string | null; title?: string | null } | null
  ticketType?: { id?: string | null; name?: string | null } | null
  checkedIn?: boolean | null
  checkedInAt?: string | null
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

export async function listPublishedEvents(token: string) {
  const events: PublicEvent[] = []
  let offset = 0
  let total: number | undefined
  do {
    const page = await request<{ events?: Array<PublicEvent | null> | null; total?: number | null }>(token, `/api/v1/events?limit=100&offset=${offset}`)
    const rows = Array.isArray(page?.events) ? page.events.filter((event): event is PublicEvent => Boolean(event && event.id)) : []
    events.push(...rows)
    total = typeof page?.total === 'number' ? page.total : undefined
    if (rows.length === 0 || total === undefined) break
    offset += rows.length
  } while (offset < total)
  return { events }
}

export function getPublicEvent(token: string, eventId: string) {
  return request<PublicEventDetails>(token, `/api/v1/events/${encodeURIComponent(eventId)}`)
}

export function verifyTicket(token: string, eventId: string, code: string) {
  return request<TicketVerificationResult>(token, '/api/v1/tickets/verify', {
    method: 'POST', body: JSON.stringify({ eventId, code }),
  })
}

export async function listAdminEvents(token: string, filters: { orgId?: string; status?: string } = {}) {
  const query = new URLSearchParams()
  if (filters.orgId) query.set('orgId', filters.orgId)
  if (filters.status) query.set('status', filters.status)
  const response = await request<{ events?: Array<AdminEvent | null> | null }>(token, `/api/admin/events${query.size ? `?${query}` : ''}`)
  return { events: Array.isArray(response?.events) ? response.events.filter((event): event is AdminEvent => Boolean(event && event.id)) : [] }
}

export function getAdminEvent(token: string, eventId: string) {
  return request<{ event?: AdminEvent | null; ticketTypes?: Array<AdminTicketType | null> | null }>(token, `/api/admin/events/${encodeURIComponent(eventId)}`)
}

export function createAdminEvent(token: string, orgId: string, input: AdminEventInput) {
  return request<AdminEvent>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/events`, { method: 'POST', body: JSON.stringify(input) })
}

export function updateAdminEvent(token: string, eventId: string, input: AdminEventInput) {
  return request<AdminEvent>(token, `/api/admin/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function publishAdminEvent(token: string, eventId: string) {
  return request<AdminEvent>(token, `/api/admin/events/${encodeURIComponent(eventId)}/publish`, { method: 'POST' })
}

export async function listAdminTicketTypes(token: string, eventId: string) {
  const response = await request<{ ticketTypes?: Array<AdminTicketType | null> | null }>(token, `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types`)
  return { ticketTypes: Array.isArray(response?.ticketTypes) ? response.ticketTypes.filter((ticket): ticket is AdminTicketType => Boolean(ticket && ticket.id)) : [] }
}

export function createAdminTicketType(token: string, eventId: string, input: AdminTicketTypeInput) {
  return request<AdminTicketType>(token, `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types`, { method: 'POST', body: JSON.stringify(input) })
}

export function updateAdminTicketType(token: string, eventId: string, ticketTypeId: string, input: AdminTicketTypeInput) {
  return request<AdminTicketType>(token, `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ticketTypeId)}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteAdminTicketType(token: string, eventId: string, ticketTypeId: string) {
  return request<{ deleted?: string }>(token, `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ticketTypeId)}`, { method: 'DELETE' })
}

export async function listAdminEventOrders(token: string, eventId: string, limit: number, offset: number) {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const response = await request<{ orders?: Array<AdminOrder | null> | null; total?: number | null }>(token, `/api/admin/events/${encodeURIComponent(eventId)}/orders?${query}`)
  return {
    orders: Array.isArray(response?.orders) ? response.orders.filter((order): order is AdminOrder => Boolean(order && order.id)) : [],
    total: typeof response?.total === 'number' && Number.isFinite(response.total) && response.total >= 0
      ? response.total
      : Array.isArray(response?.orders) ? response.orders.filter((order) => Boolean(order && order.id)).length : 0,
  }
}
