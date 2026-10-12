import { useParams } from '@tanstack/react-router'
import { AdminEventsPage, AdminEventDetailsPage } from './admin-events-page'

export function EventsPage() {
  return <AdminEventsPage />
}

export function EventDetailsPage() {
  const { eventId } = useParams({ strict: false })
  return <AdminEventDetailsPage eventId={eventId ?? ''} />
}
