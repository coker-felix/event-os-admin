import { createFileRoute } from '@tanstack/react-router'
import { ContractsPage } from '@/components/contracts/contracts-page'

export const Route = createFileRoute('/app/_dashboard/contracts/')({
  component: ContractsPage,
})
