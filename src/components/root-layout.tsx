import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useSidebarStore } from '../stores/sidebar-store'

const navigation = [
  { to: '/app', label: 'Overview', icon: '◫' },
  { to: '/app/events', label: 'Events', icon: '▦' },
  { to: '/app/admins/people', label: 'People', icon: '♧' },
  { to: '/app/contracts', label: 'Contracts', icon: '▤' },
] as const

export function RootLayout() {
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <div className="min-h-screen bg-canvas">
      <aside className={`fixed inset-y-0 left-0 z-10 flex flex-col border-r border-line bg-surface transition-[width] ${collapsed ? 'w-[76px]' : 'w-[248px]'}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-line px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-bold text-white">E</span>
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight">event<span className="text-brand">OS</span></span>}
        </div>
        <div className="px-3 pt-7">
          {!collapsed && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Workspace</p>}
          <nav aria-label="Main navigation" className="space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.to || (item.to !== '/app' && pathname.startsWith(`${item.to}/`))
              return <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}>
                <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-[17px]">{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-line p-3">
          <button onClick={toggle} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-ink-muted hover:bg-surface-muted" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <span aria-hidden="true" className="grid size-5 place-items-center">⇤</span>{!collapsed && 'Collapse sidebar'}
          </button>
          {!collapsed && <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-muted p-3"><span className="grid size-8 place-items-center rounded-full bg-[#d9d5ff] text-xs font-semibold text-brand">AD</span><div className="min-w-0"><p className="truncate text-xs font-semibold">Admin user</p><p className="truncate text-[11px] text-ink-muted">admin@eventos.io</p></div></div>}
        </div>
      </aside>
      <div className={`min-h-screen transition-[margin] ${collapsed ? 'ml-[76px]' : 'ml-[248px]'}`}>
        <header className="sticky top-0 z-[5] flex h-[76px] items-center justify-between border-b border-line bg-surface/90 px-8 backdrop-blur">
          <div className="text-[13px] text-ink-muted">Workspace <span className="mx-2 text-line">/</span> <span className="font-medium text-ink">Admin</span></div>
          <div className="flex items-center gap-4"><button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted">♧<span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" /></button><span className="grid size-9 place-items-center rounded-full bg-[#d9d5ff] text-xs font-semibold text-brand">AD</span></div>
        </header>
        <main className="mx-auto max-w-[1440px] px-8 py-8"><Outlet /></main>
      </div>
    </div>
  )
}
