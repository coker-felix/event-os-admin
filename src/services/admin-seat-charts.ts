import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export interface SeatChartTemplate {
  id: string
  title: string
  versionId: string
  checksum: string
  createdAt: number
}

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedAdminFetch(token, `${adminApiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`)
  return body as T
}

export const getSeatChartTemplates = (token: string) =>
  request<{ templates?: SeatChartTemplate[] }>(token, '/api/admin/seat-chart-templates')

export const createSeatChartTemplate = (token: string, versionId: string, title: string) =>
  request<SeatChartTemplate>(token, '/api/admin/seat-chart-templates', {
    method: 'POST',
    body: JSON.stringify({ versionId, title }),
  })
