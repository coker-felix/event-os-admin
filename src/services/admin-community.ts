import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface TargetPreview {
  targetType: string
  targetId: string
  title?: string | null
  excerpt?: string | null
  status?: string | null
  authorUserId?: string | null
  authorName?: string | null
  authorSuspended?: boolean
}
export interface CommunityReport {
  id: string
  targetType: string
  targetId: string
  reason: string
  status: string
  createdAt?: string | null
  targetPreview: TargetPreview
  reportCount?: number
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
  userId: string
  status: string
  reason?: string
  note?: string
  submittedAt?: string
  action?: { type?: string; moderatorUserId?: string }
}
export interface AdminBlueprint {
  id: string
  title: string
  status: string
  authorUserId?: string
  authorName?: string
  creditedOrgName?: string
  version?: number
  forkCount?: number
  publishedAt?: string | null
  snapshot?: { name: string; version: number; tasks: Array<{ key: string; title: string; offsetAmount: number; offsetUnit: string; weekendPolicy: string; leadDays: number; dependsOn: string[] }> }
}
export interface Suspension { userId: string; reason: string; until?: string | null; suspendedBy?: string; since?: string }
export interface BadgeHolder { userId: string; badge: string; grantedAt?: string; name?: string; email?: string }
export interface Skill { id: string; name: string; slug: string }
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
export const getAdminProfile = (token: string, userId: string) => request(token, `/api/admin/community/profiles/${encodeURIComponent(userId)}`)
