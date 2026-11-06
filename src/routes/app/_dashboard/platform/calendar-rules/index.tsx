import { createFileRoute } from '@tanstack/react-router'
import { CalendarRulesPage } from '@/features/planning/admin-planning-pages'
export const Route = createFileRoute('/app/_dashboard/platform/calendar-rules/')({ component: CalendarRulesPage })
