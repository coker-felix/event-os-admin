import { createFileRoute } from '@tanstack/react-router'
import { VendorCalloutsPage } from '@/components/events/vendor-callouts-page'

export const Route = createFileRoute('/app/_dashboard/events/vendor-callouts/')({
  component: VendorCalloutsPage,
})
