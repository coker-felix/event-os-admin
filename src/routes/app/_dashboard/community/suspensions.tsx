import { createFileRoute } from '@tanstack/react-router'
import { SuspensionsPage } from '@/features/community/suspensions-page'

export const Route = createFileRoute('/app/_dashboard/community/suspensions')({
  component: SuspensionsPage,
})
