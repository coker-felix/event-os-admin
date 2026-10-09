import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { AppRouterContext } from '../types/router'

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: () => <Outlet />,
})
