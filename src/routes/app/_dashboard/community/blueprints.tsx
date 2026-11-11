import { createFileRoute } from '@tanstack/react-router'
import { BlueprintsPage } from '@/features/community/blueprints-page'

export const Route = createFileRoute('/app/_dashboard/community/blueprints')({
  component: BlueprintsPage,
})
