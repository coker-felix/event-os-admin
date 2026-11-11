import { createFileRoute } from '@tanstack/react-router'
import { BadgesPage } from '@/features/community/badges-page'

export const Route = createFileRoute('/app/_dashboard/community/badges')({
  component: BadgesPage,
})
