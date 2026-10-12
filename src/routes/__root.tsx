import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import type { AppRouterContext } from '../types/router'

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: () => <><Outlet /><Toaster /></>,
})
