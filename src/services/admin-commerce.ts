import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface TaxRule {
  id?: string | null
  version?: number | null
  country?: string | null
  subdivision?: string | null
  supplyKind?: 'physical' | 'virtual' | 'any' | null
  categoryId?: number | null
  component?: string | null
  rateBasisPoints?: number | null
  inclusive?: boolean | null
  requiresRegistration?: boolean | null
  exemptionHonored?: boolean | null
  remittedBy?: 'organizer' | 'platform' | null
  effectiveFrom?: number | null
  effectiveTo?: number | null
  createdAt?: number | null
  updatedAt?: number | null
}

export interface FeeRule {
  id?: string | null
  version?: number | null
  country?: string | null
  currency?: string | null
  percentBasisPoints?: number | null
  fixedPerTicketMinor?: number | null
  fixedPerOrderMinor?: number | null
  effectiveFrom?: number | null
  effectiveTo?: number | null
  createdAt?: number | null
  updatedAt?: number | null
}

export interface CommerceSettings {
  defaultFeePayer?: 'attendee' | 'organizer' | null
}

export interface OrgCommerceProfile {
  orgId?: string | null
  feePayerOverride?: string | null
  effectiveFeePayer?: string | null
  registrations?: Array<{ country?: string | null; subdivision?: string | null; registrationNumber?: string | null } | null> | null
  exemptions?: Array<{ country?: string | null; subdivision?: string | null; evidenceRef?: string | null; status?: string | null } | null> | null
}

export interface Payout {
  id?: string | null
  eventId?: string | null
  beneficiaryId?: string | null
  beneficiaryType?: string | null
  amountMinor?: number | null
  currency?: string | null
  status?: string | null
  provider?: string | null
  providerRef?: string | null
  attempts?: number | null
  scheduledFor?: number | null
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

export const listTaxRules = (token: string, country?: string) => {
  const query = country ? `?country=${encodeURIComponent(country)}` : ''
  return request<{ taxRules?: Array<TaxRule | null> | null }>(token, `/api/admin/tax-rules${query}`)
}

export const createTaxRule = (token: string, rule: TaxRule) =>
  request<TaxRule>(token, '/api/admin/tax-rules', { method: 'POST', body: JSON.stringify(rule) })

export const updateTaxRule = (token: string, id: string, rule: TaxRule) =>
  request<TaxRule>(token, `/api/admin/tax-rules/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(rule) })

export const listFeeRules = (token: string, country?: string) => {
  const query = country ? `?country=${encodeURIComponent(country)}` : ''
  return request<{ feeRules?: Array<FeeRule | null> | null }>(token, `/api/admin/fee-rules${query}`)
}

export const createFeeRule = (token: string, rule: FeeRule) =>
  request<FeeRule>(token, '/api/admin/fee-rules', { method: 'POST', body: JSON.stringify(rule) })

export const updateFeeRule = (token: string, id: string, rule: FeeRule) =>
  request<FeeRule>(token, `/api/admin/fee-rules/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(rule) })

export const getCommerceSettings = (token: string) =>
  request<CommerceSettings>(token, '/api/admin/commerce-settings')

export const updateCommerceSettings = (token: string, settings: CommerceSettings) =>
  request<CommerceSettings>(token, '/api/admin/commerce-settings', { method: 'PUT', body: JSON.stringify(settings) })

export const getOrganizationCommerceProfile = (token: string, id: string) =>
  request<OrgCommerceProfile>(token, `/api/admin/organizations/${encodeURIComponent(id)}/commerce-profile`)

export const reviewOrganizationTaxExemption = (token: string, id: string, input: { country: string; subdivision?: string; status: 'approved' | 'rejected' }) =>
  request<OrgCommerceProfile>(token, `/api/admin/organizations/${encodeURIComponent(id)}/tax-exemptions/review`, { method: 'POST', body: JSON.stringify(input) })

export const getAdminPayout = (token: string, id: string) =>
  request<Payout>(token, `/api/admin/payouts/${encodeURIComponent(id)}`)

export const listAdminPayouts = (token: string, input: { limit: number; offset: number; status?: string }) => {
  const query = new URLSearchParams({ limit: String(input.limit), offset: String(input.offset) })
  if (input.status) query.set('status', input.status)
  return request<{ payouts?: Array<Payout | null> | null; total?: number | null }>(token, `/api/admin/payouts?${query}`)
}
