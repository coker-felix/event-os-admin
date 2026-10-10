import { createFileRoute } from '@tanstack/react-router'
import { FeatureFlagsPage } from '@/components/feature-flags-page'

export const Route = createFileRoute('/app/_dashboard/staff/flags/')({
  component: FeatureFlagsPage,
})
