import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

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
