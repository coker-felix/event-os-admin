import { createFileRoute } from '@tanstack/react-router'
import { PeoplePage } from '@/components/people-page'

export const Route = createFileRoute('/app/_dashboard/admins/people/')({
  component: PeoplePage,
})
