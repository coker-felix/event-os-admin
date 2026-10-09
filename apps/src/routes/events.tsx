import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin } from '../router/guards'
import { EventsPage } from '../components/events-page'

export const Route = createFileRoute('/events')({
  beforeLoad: requireAdmin,
  component: EventsPage,
})
