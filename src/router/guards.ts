import { redirect } from '@tanstack/react-router'
import { getStoredAuthSession } from '../contexts/auth'

export function protectRoute({ location }: { location: { href: string; pathname: string } }) {
  if (!getStoredAuthSession()) {
    throw redirect({ to: '/signin', search: { redirect: location.pathname === '/signin' ? '/app' : location.href } as never })
  }
}
