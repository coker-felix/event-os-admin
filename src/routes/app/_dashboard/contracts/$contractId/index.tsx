import { createFileRoute } from '@tanstack/react-router'
import { ContractDetailsPage } from '@/components/contracts/contracts-page'

export const Route = createFileRoute('/app/_dashboard/contracts/$contractId/')({
  component: ContractDetailsPage,
})
