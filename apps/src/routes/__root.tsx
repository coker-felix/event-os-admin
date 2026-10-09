import { createRootRouteWithContext } from '@tanstack/react-router'
import type { AppRouterContext } from '../types/router'
import { RootLayout } from '../components/root-layout'

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootLayout,
})
