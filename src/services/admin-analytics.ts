import { adminApiBaseUrl, authenticatedAdminFetch } from './admin-auth'

export type AnalyticsModule = 'accounts' | 'events' | 'ticketing' | 'commerce' | 'marketplace' | 'contracts' | 'invoices' | 'staff' | 'platform'

export interface ModuleOverview {
  module?: string | null
  generatedAt?: string | null
  from?: string | null
  to?: string | null
  granularity?: string | null
  freshnessStatus?: 'current' | 'stale' | 'partial' | 'never_received' | string | null
  sourceUpdatedAt?: string | null
  sources?: Array<{ service?: string | null; updatedAt?: string | null; revision?: number | null; status?: string | null } | null> | null
  metrics?: Array<{ key?: string | null; label?: string | null; value?: number | null; unit?: string | null; currency?: string | null; numerator?: number | null; denominator?: number | null } | null> | null
  charts?: Array<{
    id?: string | null
    title?: string | null
    chartType?: string | null
    unit?: string | null
    granularity?: string | null
    dimension?: string | null
    series?: Array<{
      key?: string | null
      label?: string | null
      currency?: string | null
      timePoints?: Array<{ timestamp?: string | null; value?: number | null } | null> | null
      categoryPoints?: Array<{ categoryKey?: string | null; categoryLabel?: string | null; value?: number | null } | null> | null
    } | null> | null
  } | null> | null
}

export async function getModuleOverview(token: string, module: AnalyticsModule): Promise<ModuleOverview> {
  const response = await authenticatedAdminFetch(token, `${adminApiBaseUrl}/api/admin/analytics/${module}/overview`)
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `Request failed (${response.status}).`
    throw new Error(message)
  }
  return (typeof payload === 'object' && payload !== null ? payload : {}) as ModuleOverview
}
