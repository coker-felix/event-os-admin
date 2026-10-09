import type { QueryClient } from '@tanstack/react-query'

export interface AdminSession {
  userId: string
  email: string
  role: 'admin' | 'operator'
}

export interface AppRouterContext {
  queryClient: QueryClient
  session: AdminSession | null
}
