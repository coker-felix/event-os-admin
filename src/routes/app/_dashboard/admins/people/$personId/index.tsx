import { createFileRoute } from '@tanstack/react-router'
import { PersonDetailsPage } from '@/components/people-page'

export const Route = createFileRoute('/app/_dashboard/admins/people/$personId/')({
  component: PersonDetailsPage,
})
