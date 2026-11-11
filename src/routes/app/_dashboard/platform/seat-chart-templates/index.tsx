import { createFileRoute } from '@tanstack/react-router'
import { SeatChartTemplatesPage } from '@/features/planning/seat-chart-templates/SeatChartTemplatesPage'

export const Route = createFileRoute('/app/_dashboard/platform/seat-chart-templates/')({ component: SeatChartTemplatesPage })
