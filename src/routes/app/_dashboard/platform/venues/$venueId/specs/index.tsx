import { createFileRoute } from '@tanstack/react-router'
import { VenueSpecsPage } from '@/features/planning/venue-specs/VenueSpecsPage'

export const Route = createFileRoute('/app/_dashboard/platform/venues/$venueId/specs/')({ component: VenueSpecsPage })
