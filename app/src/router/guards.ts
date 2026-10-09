import { redirect } from '@tanstack/react-router'
import type { AppRouterContext } from '../types/router'

export function requireAdmin({
  context,
  location,
}: {
  context: AppRouterContext
  location: { href: string }
}) {
  if (!context.session || context.session.role !== 'admin') {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
}
