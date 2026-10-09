import { createFileRoute } from '@tanstack/react-router'
import { RootLayout } from '../../components/root-layout'
import { protectRoute } from '../../router/guards'

export const Route = createFileRoute('/app/_dashboard')({
  beforeLoad: protectRoute,
  component: RootLayout,
})
