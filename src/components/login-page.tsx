import { Link } from '@tanstack/react-router'

export function LoginPage() {
  return <section className="mx-auto max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-card"><h1 className="text-xl font-semibold">Sign in to Event OS</h1><p className="mt-2 text-sm text-ink-muted">Connect your authentication provider to complete sign in.</p><Link to="/app" className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white">Continue to dashboard</Link></section>
}
