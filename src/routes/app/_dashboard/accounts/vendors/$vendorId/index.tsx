import { createFileRoute, useParams } from '@tanstack/react-router'
import { VendorDetailsPage } from '@/components/accounts/accounts-directory-pages'

export const Route = createFileRoute('/app/_dashboard/accounts/vendors/$vendorId/')({
  component: VendorDetailsRoute,
})

function VendorDetailsRoute() {
  const { vendorId } = useParams({ strict: false })
  return <VendorDetailsPage vendorId={vendorId ?? ''} />
}
