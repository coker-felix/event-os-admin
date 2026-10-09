import { createFileRoute } from '@tanstack/react-router'
import { EventDetailsPage } from '@/components/events-page'

export const Route = createFileRoute('/app/_dashboard/events/$eventId/')({
  component: EventDetailsPage,
})
