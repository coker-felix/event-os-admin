import { createFileRoute } from '@tanstack/react-router'
import { PersonDetailsPage } from '@/components/staff/people-page'

export const Route = createFileRoute('/app/_dashboard/admins/$adminId/')({
  component: PersonDetailsPage,
})
