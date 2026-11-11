import { createFileRoute } from '@tanstack/react-router'
import { CommunityPlaceholderPage } from '@/features/community/placeholder-page'

export const Route = createFileRoute('/app/_dashboard/community/appeals')({
  component: () => <CommunityPlaceholderPage title="Appeals" />,
})
