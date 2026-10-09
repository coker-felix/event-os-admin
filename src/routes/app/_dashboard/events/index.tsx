import { createFileRoute } from '@tanstack/react-router'
import { EventsPage } from '@/components/events-page'

export const Route = createFileRoute('/app/_dashboard/events/')({
  component: EventsPage,
})
