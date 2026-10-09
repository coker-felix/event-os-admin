import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import type { AppRouterContext } from '../types/router'

export function createAppRouter(
  routeTree: AnyRoute,
  session: AppRouterContext['session'] = null,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  })

  return createRouter({
    routeTree,
    context: { queryClient, session },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}
