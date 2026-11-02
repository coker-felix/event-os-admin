import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'
import type { AdminOrganization } from './admin-account-directory'

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const response = await authenticatedAdminFetch(token, `${adminApiBaseUrl}${path}`, { ...init, headers })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string' ? payload.error : `Request failed (${response.status}).`
    throw new Error(error)
  }
  return payload as T
}

export function getAdminOrganization(token: string, id: string) {
	return request<AdminOrganization>(token, `/api/admin/organizations/${encodeURIComponent(id)}`).then((organization) => ({ organization }))
}

export interface AdminOrganizationInvite {
  id: string
  orgId?: string | null
  destination?: string | null
  roleId?: string | null
  scope?: string | null
  status?: string | null
  expiresAt?: string | null
}

export async function listOrganizationInvites(token: string, orgId: string, scope: string) {
  const payload = await request<{ invites?: Array<AdminOrganizationInvite | null> | null }>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/invites?scope=${encodeURIComponent(scope)}`)
  return { invites: Array.isArray(payload.invites) ? payload.invites.filter((invite): invite is AdminOrganizationInvite => Boolean(invite?.id)) : [] }
}

export function inviteOrganizationMember(token: string, orgId: string, input: { destination: string; roleId: string; scope: string }) {
  return request<{ inviteId: string }>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/members/invites`, { method: 'POST', body: JSON.stringify(input) })
}

export function revokeOrganizationInvite(token: string, orgId: string, inviteId: string, scope: string) {
  return request<{ revoked: boolean }>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/invites/${encodeURIComponent(inviteId)}/revoke?scope=${encodeURIComponent(scope)}`, { method: 'POST' })
}

export function setOrganizationMemberRole(token: string, orgId: string, userId: string, roleId: string, scope: string) {
  return request(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}/role`, { method: 'PATCH', body: JSON.stringify({ roleId, scope }) })
}

export function setOrganizationMemberStatus(token: string, orgId: string, userId: string, status: string, scope: string) {
  return request(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}/status`, { method: 'PATCH', body: JSON.stringify({ status, scope }) })
}

export function removeOrganizationMember(token: string, orgId: string, userId: string, scope: string) {
  return request(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE', body: JSON.stringify({ scope }) })
}

export function addOrganizationCapability(token: string, orgId: string, input: { capability: 'organize' | 'vend' | 'host'; reason: string; idempotencyKey: string }) {
  return request<{ capability?: { capability: string; status?: string; kybStatus?: string } }>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/capabilities`, { method: 'POST', headers: { 'Idempotency-Key': input.idempotencyKey }, body: JSON.stringify({ ...input, idempotencyKey: input.idempotencyKey }) })
}

export interface OrganizationKYBEvidence { artifactId: string; kind: string; scanStatus: 'pending' | 'clean' | 'quarantined'; sha256?: string; contentType?: string; sizeBytes?: number }
interface KYBUploadAuthorization { artifactId: string; uploadUrl: string; method: string; headers: Record<string, string>; expiresAt: string; scanStatus: string }

async function rawUpload(url: string, method: string, headers: Record<string, string>, file: File) {
  const response = await fetch(url, { method, headers, body: file })
  if (!response.ok) throw new Error('The evidence upload did not complete. Request a new upload and retry.')
}

export async function uploadOrganizationKYBEvidence(token: string, orgId: string, capability: string, kind: string, file: File): Promise<OrganizationKYBEvidence> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const sha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
  const authorization = await request<KYBUploadAuthorization>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/kyb-evidence/uploads`, {
    method: 'POST', body: JSON.stringify({ capability, kind, contentType: file.type, sizeBytes: file.size, sha256 }),
  })
  await rawUpload(authorization.uploadUrl, authorization.method, authorization.headers ?? {}, file)
  const artifact = await request<OrganizationKYBEvidence>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/kyb-evidence/${encodeURIComponent(authorization.artifactId)}/complete`, { method: 'POST' })
  return { ...artifact, artifactId: authorization.artifactId, kind, scanStatus: artifact.scanStatus ?? 'pending' }
}

export function getOrganizationKYBEvidence(token: string, orgId: string, capability: string, artifactId: string) {
  return request<OrganizationKYBEvidence>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/kyb-evidence/${encodeURIComponent(artifactId)}?capability=${encodeURIComponent(capability)}`)
}

export function submitOrganizationCapabilityKYB(token: string, orgId: string, capability: string, documents: Array<{ kind: string; artifactId: string }>, idempotencyKey: string) {
  return request<{ orgId: string; capability: string; status: string }>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/capabilities/${encodeURIComponent(capability)}/kyb`, {
    method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ documents, idempotencyKey }),
  })
}

export function decideOrganizationCapabilityKYB(token: string, orgId: string, capability: string, status: 'approved' | 'rejected', reason: string) {
  return request(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/capabilities/${encodeURIComponent(capability)}/kyb/decision`, { method: 'POST', body: JSON.stringify({ status, reason }) })
}

export function setOrganizationCapabilityStatus(token: string, orgId: string, capability: string, status: 'active' | 'suspended' | 'pending' | 'revoked', reason: string) {
  return request(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/capabilities/${encodeURIComponent(capability)}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) })
}

export interface OrganizationVendorProfile {
  id: string; accountId: string; businessName: string; contactName?: string; email?: string; phone?: string;
  status: string; tier: string; category?: string; city?: string; country?: string;
  profileStats?: { ratingCount: number; averageRating: number; completedBookingCount: number } | null
}
export interface OrganizationVendorServiceArea { id: string; vendorId: string; countryCode: string; regionCode?: string; locality?: string }

export async function listOrganizationVendorProfiles(token: string, orgId: string) {
  const payload = await request<{ vendors?: Array<OrganizationVendorProfile | null> | null }>(token, `/api/admin/vendors?managingOrgId=${encodeURIComponent(orgId)}`)
  return { vendors: Array.isArray(payload.vendors) ? payload.vendors.filter((vendor): vendor is OrganizationVendorProfile => Boolean(vendor?.id)) : [] }
}

export function createOrganizationVendorProfile(token: string, orgId: string, input: { accountId: string; businessName: string; email?: string; phone?: string; category?: string; city?: string; country?: string }) {
  return request<OrganizationVendorProfile>(token, '/api/admin/vendors', { method: 'POST', body: JSON.stringify({ ...input, managingOrgId: orgId }) })
}

export async function listOrganizationVendorServiceAreas(token: string, orgId: string, vendorId: string) {
  const payload = await request<{ serviceAreas?: Array<OrganizationVendorServiceArea | null> | null }>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/vendor-profiles/${encodeURIComponent(vendorId)}/service-areas`)
  return { serviceAreas: Array.isArray(payload.serviceAreas) ? payload.serviceAreas.filter((area): area is OrganizationVendorServiceArea => Boolean(area?.id)) : [] }
}

export function replaceOrganizationVendorServiceAreas(token: string, orgId: string, vendorId: string, serviceAreas: Array<Pick<OrganizationVendorServiceArea, 'countryCode' | 'regionCode' | 'locality'>>) {
  return request<{ serviceAreas: OrganizationVendorServiceArea[] }>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/vendor-profiles/${encodeURIComponent(vendorId)}/service-areas`, { method: 'PUT', body: JSON.stringify({ serviceAreas }) })
}

export interface OrganizationVenue {
  id: string; managingOrgId: string; name: string; address?: string; city?: string; country?: string; capacity: number;
  status: string; createdVia: string; category?: string; description?: string; amenities?: string[]; websiteUrl?: string; socialLinks?: Record<string, string>;
}
export function listOrganizationVenues(token: string, orgId: string) {
  return request<{ venues?: Array<OrganizationVenue | null> | null }>(token, `/api/admin/venues?managingOrgId=${encodeURIComponent(orgId)}`).then((payload) => ({ venues: Array.isArray(payload.venues) ? payload.venues.filter((venue): venue is OrganizationVenue => Boolean(venue?.id)) : [] }))
}
export function getOrganizationVenue(token: string, orgId: string, venueId: string) {
  return request<OrganizationVenue>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/venues/${encodeURIComponent(venueId)}`)
}
export function createOrganizationVenue(token: string, orgId: string, input: Omit<OrganizationVenue, 'id' | 'managingOrgId' | 'status' | 'createdVia'>) {
  return request<OrganizationVenue>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/venues`, { method: 'POST', body: JSON.stringify(input) })
}
export function updateOrganizationVenue(token: string, orgId: string, venueId: string, input: Omit<OrganizationVenue, 'id' | 'managingOrgId' | 'status' | 'createdVia'>) {
  return request<OrganizationVenue>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/venues/${encodeURIComponent(venueId)}`, { method: 'PATCH', body: JSON.stringify(input) })
}
export function archiveOrganizationVenue(token: string, orgId: string, venueId: string, reason: string) {
  return request<OrganizationVenue>(token, `/api/admin/organizations/${encodeURIComponent(orgId)}/venues/${encodeURIComponent(venueId)}/archive`, { method: 'POST', body: JSON.stringify({ reason }) })
}
