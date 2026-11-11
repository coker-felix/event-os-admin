import { createFileRoute } from '@tanstack/react-router'
import { ReportsPage } from '@/features/community/reports-page'

export const Route = createFileRoute('/app/_dashboard/community/reports')({
  component: ReportsPage,
})
