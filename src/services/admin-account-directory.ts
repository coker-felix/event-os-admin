import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface VendorDirectoryEntry {
  id: string
  accountId?: string | null
  businessName?: string | null
  contactName?: string | null
  email?: string | null
  phone?: string | null
  status?: string | null
  tier?: 'normal' | 'verified' | 'partnered' | null
  category?: string | null
  city?: string | null
  country?: string | null
  description?: string | null
  heldPayoutAmount?: number | null
  onboardingIncomplete?: boolean | null
}

export interface VendorCatalogService {
  vendorId?: string | null
  kind?: string | null
  name?: string | null
  priceMinor?: number | string | null
  currency?: string | null
}

export interface VenueDirectoryEntry {
  id: string
  ownerAccountId?: string | null
  name?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  capacity?: number | null
  status?: string | null
  category?: string | null
  description?: string | null
  websiteUrl?: string | null
  socialLinks?: Record<string, string> | null
  amenities?: Array<string | null> | null
  claimed?: boolean | null
  createdVia?: string | null
  createdByAccountId?: string | null
  createdByOrgId?: string | null
}

export interface OrganizationCommerceProfile {
  orgId?: string | null
  feePayerOverride?: string | null
  effectiveFeePayer?: string | null
  registrations?: Array<{ country?: string | null; subdivision?: string | null; registrationNumber?: string | null } | null> | null
  exemptions?: Array<{ country?: string | null; subdivision?: string | null; status?: string | null } | null> | null
}

export interface AdminOrganization {
  id: string
  name?: string | null
  slug?: string | null
  type?: 'organizer' | 'vendor' | 'venue' | null
  ownerId?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  status?: string | null
  kycStatus?: string | null
  createdAt?: string | number | null
}

export interface CreateAdminOrganizationInput {
  owner_id: string
  name: string
  type: 'organizer' | 'vendor' | 'venue'
}

export interface CreateAdminVendorInput {
  accountId: string
  managingOrgId: string
  businessName: string
  contactName?: string
  email?: string
  phone?: string
  category?: string
  city?: string
  country?: string
  description?: string
}

export interface OrganizationMember {
  id?: string | null
  userId?: string | null
  accountId?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  roleId?: string | null
  role?: string | null
  roleName?: string | null
  status?: string | null
}

export interface DirectoryVenueInput {
  name: string
  capacity: number
  address?: string
  city?: string
  country?: string
  category?: string
  description?: string
  websiteUrl?: string
  socialLinks?: Record<string, string>
  confirmNotDuplicate?: boolean
}

export interface PatchDirectoryVenueInput {
  websiteUrl?: string
  socialLinks?: Record<string, string>
}

export interface AdminVenueClaim {
  id: string
  venueId?: string | null
  claimantAccountId?: string | null
  evidence?: Array<{ kind?: string | null; note?: string | null } | null> | null
  status?: 'pending' | 'approved' | 'rejected' | null
  designatedOrgId?: string | null
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

function normalizeRows<T extends { id: string }>(rows: Array<T | null> | null | undefined): T[] {
  return Array.isArray(rows) ? rows.filter((row): row is T => Boolean(row && typeof row.id === 'string' && row.id)) : []
}

export async function listVendorDirectory(token: string) {
  const vendors: VendorDirectoryEntry[] = []
  let offset = 0
  let total: number | undefined
  do {
    const response = await request<{ vendors?: Array<VendorDirectoryEntry | null> | null; total?: number | null }>(token, `/api/admin/vendors?status=active&limit=100&offset=${offset}`)
    const page = normalizeRows(response?.vendors)
    vendors.push(...page)
    total = typeof response?.total === 'number' ? response.total : undefined
    if (!page.length || total === undefined) break
    offset += page.length
  } while (offset < total)
  return { vendors }
}

export async function listVenueDirectory(token: string) {
  const venues: VenueDirectoryEntry[] = []
  let offset = 0
  let total: number | undefined
  do {
    const response = await request<{ venues?: Array<VenueDirectoryEntry | null> | null; total?: number | null }>(token, `/api/admin/venues?status=active&limit=100&offset=${offset}`)
    const page = normalizeRows(response?.venues)
    venues.push(...page)
    total = typeof response?.total === 'number' ? response.total : undefined
    if (!page.length || total === undefined) break
    offset += page.length
  } while (offset < total)
  return { venues }
}

export function getAdminVendor(token: string, id: string) {
  return request<VendorDirectoryEntry>(token, `/api/admin/vendors/${encodeURIComponent(id)}`)
}

export async function listVendorCatalogServices(token: string, id: string) {
  const response = await request<{ services?: Array<VendorCatalogService | null> | null }>(token, `/api/v1/vendors/${encodeURIComponent(id)}/services`)
  return { services: Array.isArray(response?.services) ? response.services.filter((service): service is VendorCatalogService => Boolean(service && service.kind)) : [] }
}

export function getAdminVenue(token: string, id: string) {
  return request<VenueDirectoryEntry>(token, `/api/admin/venues/${encodeURIComponent(id)}`)
}

export function updateVendorTier(token: string, id: string, tier: NonNullable<VendorDirectoryEntry['tier']>) {
  return request<VendorDirectoryEntry>(token, `/api/admin/vendors/${encodeURIComponent(id)}/tier`, {
    method: 'PATCH', body: JSON.stringify({ tier }),
  })
}

export function setVendorStatus(token: string, id: string, status: 'pending_approval' | 'active' | 'suspended') {
  return request<{ status?: string | null }>(token, `/api/admin/vendors/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export function setVenueStatus(token: string, id: string, status: 'pending_approval' | 'active' | 'suspended') {
  return request<{ status?: string | null }>(token, `/api/admin/venues/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export async function listPendingVenueClaims(token: string) {
  const response = await request<{ claims?: Array<AdminVenueClaim | null> | null }>(token, '/api/admin/venue-claims?status=pending')
  return { claims: Array.isArray(response?.claims) ? response.claims.filter((claim): claim is AdminVenueClaim => Boolean(claim && claim.id)) : [] }
}

export function decideVenueClaim(token: string, claimId: string, decision: 'approve' | 'reject', note?: string) {
  return request<{ claim?: AdminVenueClaim | null }>(token, `/api/admin/venue-claims/${encodeURIComponent(claimId)}/${decision}`, {
    method: 'POST', body: JSON.stringify(note?.trim() ? { note: note.trim() } : {}),
  })
}

export function createDirectoryVenue(token: string, input: DirectoryVenueInput) {
  return request<{ created?: boolean; venue?: VenueDirectoryEntry | null; duplicateCandidates?: Array<VenueDirectoryEntry | null> | null }>(token, '/api/admin/venues', {
    method: 'POST', body: JSON.stringify(input),
  })
}

export function patchDirectoryVenue(token: string, id: string, input: PatchDirectoryVenueInput) {
  return request<VenueDirectoryEntry>(token, `/api/admin/venues/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(input),
  })
}

export function getVenueOwnershipHistory(token: string, id: string) {
  return request<{ venue?: VenueDirectoryEntry | null; events?: Array<{ id: string; reason?: string | null; fromAccountId?: string | null; toAccountId?: string | null; at?: number | null } | null> | null }>(token, `/api/admin/venues/${encodeURIComponent(id)}/ownership-history`)
}

export function getOrganizationCommerceProfile(token: string, id: string) {
  return request<OrganizationCommerceProfile>(token, `/api/admin/organizations/${encodeURIComponent(id)}/commerce-profile`)
}

export async function listAdminOrganizations(token: string, type?: NonNullable<AdminOrganization['type']>) {
  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  const response = await request<{ organizations?: Array<AdminOrganization | null> | null } | Array<AdminOrganization | null>>(token, `/api/admin/organizations${query}`)
  const rows = Array.isArray(response) ? response : response?.organizations
  return { organizations: normalizeRows(rows) }
}

export function createAdminOrganization(token: string, input: CreateAdminOrganizationInput) {
  return request<{ organization?: AdminOrganization | null } & Partial<AdminOrganization>>(token, '/api/admin/organizations', {
    method: 'POST', body: JSON.stringify(input),
  })
}

export function createAdminVendor(token: string, input: CreateAdminVendorInput) {
  return request<{ vendor?: VendorDirectoryEntry | null } & Partial<VendorDirectoryEntry>>(token, '/api/admin/vendors', {
    method: 'POST', body: JSON.stringify(input),
  })
}

export async function listOrganizationMembers(token: string, id: string) {
  const response = await request<{ members?: Array<OrganizationMember | null> | null } | Array<OrganizationMember | null>>(token, `/api/admin/organizations/${encodeURIComponent(id)}/members`)
  const rows = Array.isArray(response) ? response : response?.members
  return { members: Array.isArray(rows) ? rows.filter((member): member is OrganizationMember => Boolean(member && typeof member === 'object')) : [] }
}

export function reviewOrganizationTaxExemption(token: string, id: string, input: { country: string; subdivision?: string; status: 'approved' | 'rejected' }) {
  return request<OrganizationCommerceProfile>(token, `/api/admin/organizations/${encodeURIComponent(id)}/tax-exemptions/review`, {
    method: 'POST', body: JSON.stringify(input),
  })
}

export async function listVenueOrganizationReconciliation(token: string) {
  const items: Array<{ venueId: string; ownerAccountId?: string | null; name?: string | null; queuedAt?: number | null }> = []
  let pageToken = ''
  do {
    const query = new URLSearchParams({ pageSize: '200', ...(pageToken ? { pageToken } : {}) })
    const page = await request<{ items?: Array<{ venueId: string; ownerAccountId?: string | null; name?: string | null; queuedAt?: number | null } | null> | null; nextPageToken?: string | null }>(token, `/api/admin/venue-org-reconciliation?${query}`)
    if (Array.isArray(page?.items)) items.push(...page.items.filter((item): item is NonNullable<typeof item> => Boolean(item && item.venueId)))
    const next = page?.nextPageToken || ''
    if (!next || next === pageToken) break
    pageToken = next
  } while (pageToken)
  return { items }
}

export function resolveVenueOrganization(token: string, id: string, managingOrgId: string, reason: string) {
  return request(token, `/api/admin/venues/${encodeURIComponent(id)}/managing-org`, {
    method: 'POST', body: JSON.stringify({ managingOrgId, reason }),
  })
}
