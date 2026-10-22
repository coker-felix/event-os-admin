import { createFileRoute } from '@tanstack/react-router'
import { AdminEventCreatePage } from '@/components/events/admin-events-page'

export const Route = createFileRoute('/app/_dashboard/events/create')({
  component: AdminEventCreatePage,
})
