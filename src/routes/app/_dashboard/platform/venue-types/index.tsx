import { createFileRoute } from '@tanstack/react-router'
import { VenueTypesPage } from '@/features/planning/admin-planning-pages'
export const Route = createFileRoute('/app/_dashboard/platform/venue-types/')({ component: VenueTypesPage })
