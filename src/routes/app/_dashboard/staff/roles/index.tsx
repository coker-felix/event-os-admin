import { createFileRoute } from '@tanstack/react-router'
import { StaffRolesPage } from '@/components/staff-roles-page'

export const Route = createFileRoute('/app/_dashboard/staff/roles/')({
  component: StaffRolesPage,
})
