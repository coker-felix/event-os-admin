import type { ReactNode } from 'react'

export function PageShell({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
