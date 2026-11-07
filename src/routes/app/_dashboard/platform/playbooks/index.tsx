import { createFileRoute } from '@tanstack/react-router'
import { PlaybooksPage } from '@/features/planning/playbooks/PlaybooksPage'
export const Route = createFileRoute('/app/_dashboard/platform/playbooks/')({ component: PlaybooksPage })
