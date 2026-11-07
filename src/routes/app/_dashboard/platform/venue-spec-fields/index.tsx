import { createFileRoute } from '@tanstack/react-router'
import { VenueSpecFieldsPage } from '@/features/planning/venue-spec-fields/VenueSpecFieldsPage'
export const Route = createFileRoute('/app/_dashboard/platform/venue-spec-fields/')({ component: VenueSpecFieldsPage })
