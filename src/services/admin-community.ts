import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface TargetPreview {
  title: string
  excerpt: string
  authorUserId: string
  authorName: string
  authorSuspended: boolean
  status: string
}
export interface CommunityReport {
  id: string
  reporterUserId: string
  targetType: string
  targetId: string
  reason: string
  details: string
  status: string
  createdAt: string
  targetPreview: TargetPreview
  openReportCount: number
}
export interface ModerationActionInput {
  targetType: string
  targetId: string
  action: string
  reason: string
  reportId?: string
  until?: string
}
export interface Appeal {
  id: string
  actionId: string
  userId: string
  note: string
  status: string
  decidedBy: string
  createdAt: string
  user: AppealUser
  action: AppealAction
}
export interface AppealUser { userId: string; displayName: string }
export interface AppealAction { id: string; action: string; reason: string; targetType: string; targetId: string; moderatorUserId: string }
export interface AdminBlueprint {
  id: string
  title: string
  summary: string
  authorUserId: string
  status: string
  creditedOrgId: string
  currentVersion: number
  forkCount: number
  createdAt: string
  authorName: string
}
export interface Suspension { userId: string; reason: string; until: string; suspendedBy: string; createdAt: string; displayName: string }
export interface BadgeHolder { userId: string; badge: string; grantedBy: string; grantedAt: string; displayName: string }
export interface Skill { id: string; name: string; slug: string }
export interface Profile { userId: string; displayName: string; headline: string; bio: string; country: string; city: string; availability: string; visibility: string; status: string; skillIds: string[]; badges: string[]; accountState: string; can?: { publishBlueprint: boolean; report: boolean; appeal: boolean } | null }
export interface ProfileResponse { profile?: Profile | null; accountState: string; can?: { publishBlueprint: boolean; report: boolean; appeal: boolean } | null }
export type Page<T> = { items: T[]; total: number }

export function normalizePage<T>(value: { items?: T[] | null; total?: number | null } | null | undefined): Page<T> {
  return { items: Array.isArray(value?.items) ? value.items : [], total: typeof value?.total === 'number' ? value.total : 0 }
}
export function normalizeCollection<T, K extends string>(value: Record<K, T[] | null | undefined> | null | undefined, key: K): T[] {
  return Array.isArray(value?.[key]) ? value[key] as T[] : []
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const response = await authenticatedAdminFetch(token, `${adminApiBaseUrl}${path}`, { ...init, headers })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const payload = body as { error?: string; reason?: string } | null
    const error = new Error(payload?.error ?? `Request failed (${response.status}).`)
    Object.assign(error, { status: response.status, reason: payload?.reason })
    throw error
  }
  return body as T
}
const json = (method: string, value: unknown): RequestInit => ({ method, body: JSON.stringify(value) })
const params = (values: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') query.set(key, String(value))
  return query.size ? `?${query.toString()}` : ''
}
function list<T>(token: string, path: string, field: string, query: Record<string, string | number | undefined> = {}) {
  return request<Record<string, unknown>>(token, `${path}${params(query)}`).then((response) => ({
    ...normalizePage({ items: Array.isArray(response[field]) ? response[field] as T[] : [], total: response.total as number | undefined }),
  }))
}
export const listReports = (token: string, query: { status?: string; q?: string; limit?: number; offset?: number }) => list<CommunityReport>(token, '/api/admin/community/reports', 'reports', query)
export const moderate = (token: string, input: ModerationActionInput) => request(token, '/api/admin/community/moderation-actions', json('POST', input))
export const listAppeals = (token: string, query: { status?: string; limit?: number; offset?: number } = {}) => list<Appeal>(token, '/api/admin/community/appeals', 'appeals', query)
export const decideAppeal = (token: string, id: string, input: { decision: 'uphold' | 'reverse'; note: string }) => request(token, `/api/admin/community/appeals/${encodeURIComponent(id)}/decide`, json('POST', input))
export const listBlueprints = (token: string, query: { status?: string; q?: string; limit?: number; offset?: number } = {}) => list<AdminBlueprint>(token, '/api/admin/community/blueprints', 'blueprints', query)
export const listSuspensions = (token: string, query: { limit?: number; offset?: number } = {}) => list<Suspension>(token, '/api/admin/community/suspensions', 'suspensions', query)
export const listBadges = (token: string, badge: string, query: { limit?: number; offset?: number } = {}) => list<BadgeHolder>(token, '/api/admin/community/badges', 'badges', { ...query, badge })
export const setBadge = (token: string, input: { userId: string; badge: string; grant: boolean }) => request(token, '/api/admin/community/badges', json('POST', input))
export const listSkills = (token: string, query: { limit?: number; offset?: number } = {}) => list<Skill>(token, '/api/admin/community/skills', 'skills', query)
export const upsertSkill = (token: string, id: string, input: { name: string; slug: string }) => request<Skill>(token, `/api/admin/community/skills/${encodeURIComponent(id)}`, json('PUT', input))
export const getAdminProfile = (token: string, userId: string) => request<ProfileResponse>(token, `/api/admin/community/profiles/${encodeURIComponent(userId)}`)
