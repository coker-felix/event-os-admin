import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useSidebarStore } from '../stores/sidebar-store'
import type { AdminNavigationModule } from '@/types/admin-modules'

const navigation: readonly AdminNavigationModule[] = [
  {
    id: 'accounts', label: 'Accounts', icon: '♧', items: [
      { label: 'Users', to: '/app/accounts/users' },
      { label: 'KYC review', to: '/app/accounts/kyc' },
    ],
  },
  {
    id: 'staff', label: 'Staff & access', icon: '♙', items: [
      { label: 'Admin users', to: '/app/staff/admins' },
      { label: 'Roles & permissions', to: '/app/staff/roles' },
      { label: 'Feature flags', to: '/app/staff/flags' },
    ],
  },
  {
    id: 'platform', label: 'Platform', icon: '⚙', items: [
      { label: 'Platform settings', to: '/app/platform/settings' },
      { label: 'Sponsors', to: '/app/platform/sponsors' },
      { label: 'Countries', to: '/app/platform/countries' },
      { label: 'Subdivisions', to: '/app/platform/subdivisions' },
      { label: 'Distribution channels', to: '/app/platform/distribution-channels' },
      { label: 'Event categories', to: '/app/platform/event-categories' },
    ],
  },
  {
    id: 'commerce', label: 'Commerce', icon: '◇', items: [
      { label: 'Tax rules', to: '/app/commerce/taxes' },
      { label: 'Fee rules', to: '/app/commerce/fees' },
      { label: 'Commerce settings', to: '/app/commerce/commerce' },
      { label: 'Tax exemptions', to: '/app/commerce/exemptions' },
      { label: 'Payouts', to: '/app/commerce/payouts' },
    ],
  },
  {
    id: 'marketplace', label: 'Marketplace', icon: '⌂', items: [
      { label: 'Vendors', to: '/app/marketplace/vendors' },
      { label: 'Venues', to: '/app/marketplace/venues' },
      { label: 'Venue claims', to: '/app/marketplace/claims' },
      { label: 'Organization reconciliation', to: '/app/marketplace/reconciliation' },
    ],
  },
  {
    id: 'documents', label: 'Documents', icon: '▤', items: [
      { label: 'Legal identities', to: '/app/documents/identities' },
      { label: 'Document clauses', to: '/app/documents/clauses' },
      { label: 'Contract templates', to: '/app/documents/templates' },
      { label: 'Document settings', to: '/app/documents/document-settings' },
      { label: 'Artifacts', to: '/app/documents/artifacts' },
      { label: 'Retention policies', to: '/app/documents/retention' },
      { label: 'Catalog render jobs', to: '/app/documents/render-jobs' },
      { label: 'Contracts', to: '/app/documents/contracts' },
      { label: 'Lifecycle events', to: '/app/documents/lifecycle' },
      { label: 'Operations render jobs', to: '/app/documents/operations-render-jobs' },
      { label: 'Vendor contract backfills', to: '/app/documents/vendor-contract-backfills' },
      { label: 'Venue contract backfills', to: '/app/documents/venue-contract-backfills' },
      { label: 'Contract reconciliation', to: '/app/documents/contract-reconciliation' },
    ],
  },
]

export function RootLayout() {
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    accounts: true, staff: true, platform: true, commerce: true, marketplace: true, documents: true,
  })

  return (
    <div className="min-h-screen bg-canvas">
      <aside className={`fixed inset-y-0 left-0 z-10 flex flex-col border-r border-line bg-surface transition-[width] ${collapsed ? 'w-[76px]' : 'w-[248px]'}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-line px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-bold text-white">E</span>
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight">event<span className="text-brand">OS</span></span>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-7">
          {!collapsed && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Workspace</p>}
          <nav aria-label="Main navigation" className="space-y-1">
            <Link to="/app" title={collapsed ? 'Overview' : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${pathname === '/app' ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}>
              <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-[17px]">◫</span>{!collapsed && 'Overview'}
            </Link>
            {navigation.map((group) => {
              const groupActive = group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
              const isExpanded = expanded[group.id] ?? groupActive
              return <div key={group.id}>
                <button type="button" onClick={() => setExpanded((current) => ({ ...current, [group.id]: !isExpanded }))} title={collapsed ? group.label : undefined} aria-expanded={!collapsed && isExpanded} className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-colors ${groupActive ? 'text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}>
                  <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-[17px]">{group.icon}</span>
                  {!collapsed && <><span className="flex-1">{group.label}</span><span aria-hidden="true" className="text-[10px]">{isExpanded ? '⌄' : '›'}</span></>}
                </button>
                {!collapsed && isExpanded && <div className="ml-[22px] space-y-0.5 border-l border-line py-1 pl-3">
                  {group.items.map((item) => {
                    const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
                    return <Link key={item.to} to={item.to as never} aria-current={active ? 'page' : undefined} className={`flex min-h-8 items-center rounded-md px-2 text-xs transition-colors ${active ? 'bg-brand-soft font-medium text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}>{item.label}</Link>
                  })}
                </div>}
              </div>
            })}
          </nav>
        </div>
        <div className="border-t border-line p-3">
          <button onClick={toggle} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-ink-muted hover:bg-surface-muted" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <span aria-hidden="true" className="grid size-5 place-items-center">⇤</span>{!collapsed && 'Collapse sidebar'}
          </button>
          {!collapsed && <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-muted p-3"><span className="grid size-8 place-items-center rounded-full bg-[#d9d5ff] text-xs font-semibold text-brand">AD</span><div className="min-w-0"><p className="truncate text-xs font-semibold">Admin user</p><p className="truncate text-[11px] text-ink-muted">admin@eventos.io</p></div></div>}
        </div>
      </aside>
      <div className={`min-h-screen transition-[margin] ${collapsed ? 'ml-[76px]' : 'ml-[248px]'}`}>
        <header className="sticky top-0 z-[5] flex h-[76px] items-center justify-between border-b border-line bg-surface/90 px-8 font-sans text-sm backdrop-blur">
          <div className="text-ink-muted">Workspace <span className="mx-2 text-line">/</span> <span className="font-medium text-ink">Admin</span></div>
          <div className="flex items-center gap-4"><button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted">♧<span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" /></button><span className="grid size-9 place-items-center rounded-full bg-[#d9d5ff] text-xs font-semibold text-brand">AD</span></div>
        </header>
        <main className="mx-auto max-w-[1440px] px-8 py-8"><Outlet /></main>
      </div>
    </div>
  )
}
