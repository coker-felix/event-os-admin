import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Archive,
  ArrowCounterClockwise,
  ArrowLineLeft,
  ArrowLineRight,
  ArrowsClockwise,
  Bank,
  Bell,
  Buildings,
  Calendar,
  CalendarCheck,
  CaretDown,
  ClockCounterClockwise,
  CurrencyDollar,
  FilePlus,
  FileText,
  Fingerprint,
  Flag,
  GearSix,
  Globe,
  Handshake,
  IdentificationBadge,
  IdentificationCard,
  LockKey,
  MagnifyingGlass,
  MapPin,
  MapTrifold,
  Moon,
  Percent,
  Question,
  QrCode,
  Receipt,
  Scales,
  ShareNetwork,
  ShieldCheck,
  ShieldSlash,
  SignOut,
  Sliders,
  SlidersHorizontal,
  SquaresFour,
  Stack,
  Storefront,
  Sun,
  Tag,
  TextAlignLeft,
  Ticket,
  User,
  UserGear,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react'
import { useSidebarStore } from '../stores/sidebar-store'
import { useAuth } from '../contexts/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { AdminNavigationModule } from '@/types/admin-modules'

const moduleIcons: Record<AdminNavigationModule['id'], Icon> = {
  accounts: UsersThree,
  events: CalendarCheck,
  ticketing: Ticket,
  staff: ShieldCheck,
  platform: GearSix,
  commerce: CurrencyDollar,
  marketplace: Storefront,
  documents: FileText,
  contracts: FileText,
  invoices: Receipt,
}

const itemIcons: Record<string, Icon> = {
  '/app/accounts/users': User,
  '/app/accounts/organizations': Buildings,
  '/app/accounts/org-users': IdentificationBadge,
  '/app/accounts/venues': MapPin,
  '/app/accounts/vendors': Storefront,
  '/app/accounts/kyc': Fingerprint,
  '/app/events': Calendar,
  '/app/ticketing/verify': QrCode,
  '/app/staff/admins': UserGear,
  '/app/staff/roles': LockKey,
  '/app/staff/flags': Flag,
  '/app/platform/settings': Sliders,
  '/app/platform/sponsors': Handshake,
  '/app/platform/countries': Globe,
  '/app/platform/subdivisions': MapTrifold,
  '/app/platform/distribution-channels': ShareNetwork,
  '/app/platform/event-categories': Tag,
  '/app/commerce/taxes': Percent,
  '/app/commerce/fees': Receipt,
  '/app/commerce/commerce': SlidersHorizontal,
  '/app/commerce/exemptions': ShieldSlash,
  '/app/commerce/payouts': Bank,
  '/app/marketplace/vendors': Storefront,
  '/app/marketplace/venues': MapPin,
  '/app/marketplace/claims': Flag,
  '/app/marketplace/reconciliation': ArrowsClockwise,
  '/app/documents/identities': IdentificationCard,
  '/app/documents/clauses': TextAlignLeft,
  '/app/documents/templates': FilePlus,
  '/app/documents/document-settings': Sliders,
  '/app/documents/artifacts': Archive,
  '/app/documents/retention': ClockCounterClockwise,
  '/app/documents/render-jobs': Stack,
  '/app/documents/contracts': FileText,
  '/app/documents/invoices': Receipt,
  '/app/documents/lifecycle': ArrowsClockwise,
  '/app/documents/operations-render-jobs': GearSix,
  '/app/documents/vendor-contract-backfills': ArrowCounterClockwise,
  '/app/documents/venue-contract-backfills': ArrowCounterClockwise,
  '/app/documents/contract-reconciliation': Scales,
}

const navigation: readonly AdminNavigationModule[] = [
  {
    id: 'accounts', label: 'Accounts', icon: '♧', items: [
      { label: 'Overview', to: '/app/accounts/overview' },
      { label: 'Users', to: '/app/accounts/users' },
      { label: 'Organizations', to: '/app/accounts/organizations' },
      { label: 'Organization users', to: '/app/accounts/org-users' },
      { label: 'Venues', to: '/app/accounts/venues' },
      { label: 'Vendors', to: '/app/accounts/vendors' },
      { label: 'KYC review', to: '/app/accounts/kyc' },
    ],
  },
  { id: 'events', label: 'Events', icon: '◷', items: [
    { label: 'Overview', to: '/app/events' },
    { label: 'Manage events', to: '/app/events' },
  ] },
  { id: 'ticketing', label: 'Ticketing', icon: '▣', items: [
    { label: 'Overview', to: '/app/ticketing/overview' },
    { label: 'Verify ticket', to: '/app/ticketing/verify' },
  ] },
  {
    id: 'commerce', label: 'Commerce', icon: '◇', items: [
      { label: 'Overview', to: '/app/commerce/overview' },
      { label: 'Tax rules', to: '/app/commerce/taxes' },
      { label: 'Fee rules', to: '/app/commerce/fees' },
      { label: 'Commerce settings', to: '/app/commerce/commerce' },
      { label: 'Tax exemptions', to: '/app/commerce/exemptions' },
      { label: 'Payouts', to: '/app/commerce/payouts' },
    ],
  },
  {
    id: 'marketplace', label: 'Marketplace', icon: '⌂', items: [
      { label: 'Overview', to: '/app/marketplace/overview' },
      { label: 'Vendors', to: '/app/marketplace/vendors' },
      { label: 'Venues', to: '/app/marketplace/venues' },
      { label: 'Venue claims', to: '/app/marketplace/claims' },
      { label: 'Organization reconciliation', to: '/app/marketplace/reconciliation' },
    ],
  },
  {
    id: 'contracts', label: 'Contracts', icon: '▤', items: [
      { label: 'Overview', to: '/app/contracts/overview' },
      { label: 'Contracts', to: '/app/documents/contracts' },
      { label: 'Legal identities', to: '/app/documents/identities' },
      { label: 'Document clauses', to: '/app/documents/clauses' },
      { label: 'Contract templates', to: '/app/documents/templates' },
      { label: 'Document settings', to: '/app/documents/document-settings' },
      { label: 'Artifacts', to: '/app/documents/artifacts' },
      { label: 'Retention policies', to: '/app/documents/retention' },
      { label: 'Catalog render jobs', to: '/app/documents/render-jobs' },
      { label: 'Lifecycle events', to: '/app/documents/lifecycle' },
      { label: 'Operations render jobs', to: '/app/documents/operations-render-jobs' },
      { label: 'Vendor contract backfills', to: '/app/documents/vendor-contract-backfills' },
      { label: 'Venue contract backfills', to: '/app/documents/venue-contract-backfills' },
      { label: 'Contract reconciliation', to: '/app/documents/contract-reconciliation' },
    ],
  },
  {
    id: 'invoices', label: 'Invoices', icon: '▤', items: [
      { label: 'Overview', to: '/app/invoices/overview' },
      { label: 'Invoices', to: '/app/invoices/list' },
    ],
  },
  {
    id: 'staff', label: 'Staff & access', icon: '♙', items: [
      { label: 'Overview', to: '/app/staff/overview' },
      { label: 'Admin users', to: '/app/staff/admins' },
      { label: 'Roles & permissions', to: '/app/staff/roles' },
      { label: 'Feature flags', to: '/app/staff/flags' },
    ],
  },
  {
    id: 'platform', label: 'Adminstration', icon: '⚙', items: [
      { label: 'Overview', to: '/app/platform/overview' },
      { label: 'Platform settings', to: '/app/platform/settings' },
      { label: 'Sponsors', to: '/app/platform/sponsors' },
      { label: 'Countries', to: '/app/platform/countries' },
      { label: 'Subdivisions', to: '/app/platform/subdivisions' },
      { label: 'Distribution channels', to: '/app/platform/distribution-channels' },
      { label: 'Event categories', to: '/app/platform/event-categories' },
    ],
  },
]

export function RootLayout() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return window.localStorage.getItem('event-os-admin-theme') === 'dark'
    } catch {
      return false
    }
  })
  useEffect(() => {
    if (!session) void navigate({ to: '/signin', search: { redirect: pathname || '/app' } as never })
  }, [navigate, pathname, session])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      window.localStorage.setItem('event-os-admin-theme', isDarkMode ? 'dark' : 'light')
    } catch {
      // The dashboard remains usable when browser storage is unavailable.
    }
  }, [isDarkMode])

  return (
    <div className={`min-h-screen bg-canvas ${isDarkMode ? 'dark' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-10 flex flex-col border-r border-line bg-surface transition-[width] ${collapsed ? 'w-[76px]' : 'w-[248px]'}`}>
        <div className="flex h-14 items-center gap-3 border-b border-line px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-bold text-white shadow-card">E</span>
          {!collapsed && <span className="min-w-0"><span className="block text-[15px] font-semibold tracking-tight">event<span className="text-brand">OS</span></span><span className="block text-[11px] text-ink-muted">Admin Console</span></span>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-6">
          <nav aria-label="Main navigation" className="space-y-1">
            <Link to="/app" title={collapsed ? 'Overview' : undefined} aria-current={pathname === '/app' ? 'page' : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${pathname === '/app' ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}>
              <SquaresFour aria-hidden="true" size={18} weight={pathname === '/app' ? 'fill' : 'duotone'} className="shrink-0" />
              {!collapsed && 'Overview'}
            </Link>
            {navigation.map((group) => {
              const GroupIcon = moduleIcons[group.id]
              const organizationDetailActive = group.id === 'accounts' && pathname.startsWith('/app/organizations/')
              const groupActive = organizationDetailActive || group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
              const isExpanded = expanded[group.id] ?? groupActive

              if (!isExpanded) {
                return (
                  <Link
                    key={group.id}
                    to={group.items[0].to as never}
                    title={collapsed ? group.label : undefined}
                    onClick={() => setExpanded((current) => { const next = { ...current }; delete next[group.id]; return next })}
                    className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <GroupIcon aria-hidden="true" size={18} weight="duotone" className="shrink-0" />
                    {!collapsed && group.label}
                  </Link>
                )
              }

              return <div key={group.id}>
                <button type="button" onClick={() => setExpanded((current) => ({ ...current, [group.id]: false }))} title={collapsed ? group.label : undefined} aria-expanded={!collapsed} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted">
                  <GroupIcon aria-hidden="true" size={20} weight="duotone" className="shrink-0" />
                  {!collapsed && <><span className="flex-1">{group.label}</span><CaretDown aria-hidden="true" size={12} /></>}
                </button>
                {!collapsed && <div className="space-y-0.5 py-1 pl-7">
                  {group.items.map((item) => {
                    const active = (item.to === '/app/accounts/organizations' && organizationDetailActive) || pathname === item.to || pathname.startsWith(`${item.to}/`)
                    const ItemIcon = itemIcons[item.to] ?? GroupIcon
                    return <Link key={item.to} to={item.to as never} aria-current={active ? 'page' : undefined} className={`flex min-h-8 items-center gap-2.5 rounded-lg px-2 text-xs transition-colors ${active ? 'bg-brand-soft font-medium text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}>
                      <ItemIcon aria-hidden="true" size={16} weight="duotone" className="shrink-0" />
                      {item.label}
                    </Link>
                  })}
                </div>}
              </div>
            })}
          </nav>
        </div>
        <div className="border-t border-line p-3">
          <button onClick={toggle} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-ink-muted hover:bg-surface-muted" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ArrowLineRight aria-hidden="true" size={18} /> : <ArrowLineLeft aria-hidden="true" size={18} />}{!collapsed && 'Collapse sidebar'}
          </button>
          {!collapsed && <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-muted p-3">
            <Avatar size="sm"><AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">AD</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold"></p><p className="truncate text-[11px] text-ink-muted">Admin access</p></div>
          </div>}
        </div>
      </aside>
      <div className={`min-h-screen transition-[margin] ${collapsed ? 'ml-[76px]' : 'ml-[248px]'}`}>
        <header className="sticky top-0 z-[5] flex h-14 items-center justify-end gap-4 border-b border-line bg-surface/90 px-8 font-sans text-sm backdrop-blur">
          <label className="relative flex h-10 w-full max-w-80 items-center gap-2 rounded-full border border-line bg-surface-muted px-3.5 text-ink-muted">
            <MagnifyingGlass size={14} aria-hidden="true" />
            <span className="sr-only">Search</span>
            <input type="search" placeholder="Search" className="h-full flex-1 bg-transparent text-xs outline-none placeholder:text-ink-muted" />
          </label>
          <button type="button" aria-label="Help" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted hover:text-ink">
            <Question size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Notifications" className="relative grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted hover:text-ink">
            <Bell size={16} aria-hidden="true" />
            <span aria-hidden="true" className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" />
          </button>
          <button
            type="button"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDarkMode}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setIsDarkMode((current) => !current)}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted transition-colors hover:text-ink"
          >
            {isDarkMode ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex shrink-0 items-center gap-3 rounded-full px-1.5 py-1 outline-none hover:bg-surface-muted">
              <Avatar><AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">AD</AvatarFallback></Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold">Administrator</span>
                <span className="block text-[11px] text-ink-muted">Admin access</span>
              </span>
              <CaretDown size={12} aria-hidden="true" className="hidden text-ink-muted sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => { signOut(); void navigate({ to: '/signin' }) }}>
                <SignOut size={14} aria-hidden="true" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-360 bg-canvas px-8 py-8"><Outlet /></main>
      </div>
    </div>
  )
}
