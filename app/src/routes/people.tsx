import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin } from '../router/guards'
import { PeoplePage } from '../components/people-page'

export const Route = createFileRoute('/people')({
  beforeLoad: requireAdmin,
  component: PeoplePage,
})
