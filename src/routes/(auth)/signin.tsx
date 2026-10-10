import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '../../components/login-page'
import { getStoredAuthSession } from '../../contexts/auth'

export const Route = createFileRoute('/(auth)/signin')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' && search.redirect.startsWith('/') && !search.redirect.startsWith('//')
      ? search.redirect
      : '/app',
  }),
  beforeLoad: ({ search }) => {
    if (getStoredAuthSession()) throw redirect({ to: search.redirect as never })
  },
  component: LoginPage,
})
