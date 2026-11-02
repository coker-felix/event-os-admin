import { createFileRoute, Navigate, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_dashboard/events/$eventId/')({
  component: () => {
    const { eventId } = useParams({ strict: false })
    return <Navigate to="/app/events/$eventId/view" params={{ eventId: eventId ?? '' }} />
  },
})
