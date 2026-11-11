import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_dashboard/community/')({
  beforeLoad: () => { throw redirect({ to: '/app/community/reports' }) },
})
