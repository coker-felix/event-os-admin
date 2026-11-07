import { createFileRoute } from '@tanstack/react-router'
import { StaffingRulesPage } from '@/features/planning/staffing-rules/StaffingRulesPage'
export const Route = createFileRoute('/app/_dashboard/platform/staffing-rules/')({ component: StaffingRulesPage })
