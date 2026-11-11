import { createFileRoute } from '@tanstack/react-router'
import { AppealsPage } from '@/features/community/appeals-page'

export const Route = createFileRoute('/app/_dashboard/community/appeals')({
  component: AppealsPage,
})
