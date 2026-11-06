import { createFileRoute } from '@tanstack/react-router'
import { CalendarRulesPage } from '@/features/planning/calendar-rules/CalendarRulesPage'
export const Route = createFileRoute('/app/_dashboard/platform/calendar-rules/')({ component: CalendarRulesPage })
