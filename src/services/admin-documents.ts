import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface AdminContract {
  id?: string | null
  operationId?: string | null
  relationship?: string | null
  country?: string | null
  category?: string | null
  profileKind?: string | null
  profileId?: string | null
  templateId?: string | null
  templateVersion?: number | null
  status?: string | null
  currentRevision?: number | null
  signingDeadline?: string | null
  createdAt?: string | null
  executedAt?: string | null
  parties?: Array<{ id?: string | null; role?: string | null; legalName?: string | null; organizationId?: string | null } | null> | null
  revisions?: Array<{
    id?: string | null
    revision?: number | null
    status?: string | null
    createdAt?: string | null
    signatures?: Array<{ id?: string | null; status?: string | null } | null> | null
  } | null> | null
}

export interface AdminInvoice {
  id?: string | null
  contractId?: string | null
  bookingId?: string | null
  requesterOrgId?: string | null
  eventId?: string | null
  targetType?: 'vendor' | 'venue' | string | null
  targetId?: string | null
  bookingStatus?: string | null
  amountMinor?: number | string | null
  currency?: string | null
  status?: 'draft' | 'issued' | 'paid' | 'overdue' | 'voided' | 'refunded' | string | null
  payoutHeld?: boolean | null
  createdAt?: string | null
}

async function request<T>(token: string, path: string): Promise<T> {
  const response = await authenticatedAdminFetch(token, `${adminApiBaseUrl}${path}`)
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

export function listAdminContracts(token: string, params: { pageSize: number; pageToken?: string; organizationId?: string }) {
  const query = new URLSearchParams({ page_size: String(params.pageSize) })
  if (params.pageToken) query.set('page_token', params.pageToken)
  if (params.organizationId) query.set('organization_id', params.organizationId)
  return request<{ contracts?: Array<AdminContract | null> | null; nextPageToken?: string | null }>(token, `/api/admin/contracts?${query}`)
}

export function getAdminContract(token: string, id: string) {
  return request<AdminContract>(token, `/api/admin/document-operations/contracts/${encodeURIComponent(id)}`)
}

export function listAdminInvoices(token: string, params: { pageSize: number; pageToken?: string; status?: string; targetType?: string; targetId?: string }) {
  const query = new URLSearchParams({ page_size: String(params.pageSize) })
  if (params.pageToken) query.set('page_token', params.pageToken)
  if (params.status) query.set('status', params.status)
  if (params.targetType) query.set('target_type', params.targetType)
  if (params.targetId) query.set('target_id', params.targetId)
  return request<{ invoices?: Array<AdminInvoice | null> | null; nextPageToken?: string | null }>(token, `/api/admin/invoices?${query}`)
}

export function getAdminInvoice(token: string, id: string) {
  return request<AdminInvoice>(token, `/api/admin/invoices/${encodeURIComponent(id)}`)
}
