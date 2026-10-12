import { createFileRoute } from '@tanstack/react-router'
import { StaffAdminsPage } from '@/components/staff/staff-admins-page'

export const Route = createFileRoute('/app/_dashboard/staff/admins/')({
  component: StaffAdminsPage,
})
