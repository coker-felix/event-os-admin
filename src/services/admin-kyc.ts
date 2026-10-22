import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface AdminKycProfile {
  id: string
  accountId?: string | null
  type?: string | null
  status?: string | null
  submittedAt?: string | null
  documentCount?: number | null
}

export interface AdminKycDocument {
  id?: string | null
  kind?: string | null
  refUrl?: string | null
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

export async function listAdminKycProfiles(token: string) {
  const response = await request<{ profiles?: Array<AdminKycProfile | null> | null }>(token, '/api/admin/kyc/profiles')
  return { profiles: Array.isArray(response?.profiles) ? response.profiles.filter((profile): profile is AdminKycProfile => Boolean(profile && profile.id)) : [] }
}

export async function getAdminKycProfile(token: string, profileId: string) {
  const response = await request<{ profile?: AdminKycProfile | null; documents?: Array<AdminKycDocument | null> | null }>(token, `/api/admin/kyc/profiles/${encodeURIComponent(profileId)}`)
  return {
    profile: response?.profile ?? null,
    documents: Array.isArray(response?.documents) ? response.documents.filter((document): document is AdminKycDocument => Boolean(document)) : [],
  }
}
