import { createFileRoute } from '@tanstack/react-router'
import { VenueTypesPage } from '@/features/planning/venue-types/VenueTypesPage'
export const Route = createFileRoute('/app/_dashboard/platform/venue-types/')({ component: VenueTypesPage })
