import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '../../../components/dashboard-page'

export const Route = createFileRoute('/app/_dashboard/')({ component: DashboardPage })
