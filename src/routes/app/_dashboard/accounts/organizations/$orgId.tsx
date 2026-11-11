import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_dashboard/accounts/organizations/$orgId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/$module/$section' as never,
      params: { module: 'organizations', section: params.orgId } as never,
    })
  },
})
