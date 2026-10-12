import { createFileRoute } from '@tanstack/react-router'
import { AccountsUsersPage } from '@/components/accounts/accounts-users-page'

export const Route = createFileRoute('/app/_dashboard/accounts/users/')({
  component: AccountsUsersPage,
})
