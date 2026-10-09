import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'

export function createAppRouter(routeTree: AnyRoute) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  })

  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}
