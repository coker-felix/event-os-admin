import { createFileRoute } from '@tanstack/react-router'
import { StaffingRulesPage } from '@/features/planning/admin-planning-pages'
export const Route = createFileRoute('/app/_dashboard/platform/staffing-rules/')({ component: StaffingRulesPage })
