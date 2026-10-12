import { Link, useLocation, useParams } from '@tanstack/react-router'
import { AccountsOrganizationUsersPage, AccountsOrganizationsPage, AccountsVendorsPage, AccountsVenuesPage, OrganizationDetailsPage } from '@/components/accounts-directory-pages'
import { AdminEventsPage } from '@/components/admin-events-page'
import { ContractsPage } from '@/components/contracts-page'
import { InvoicesPage } from '@/components/invoices-page'
import { TicketVerificationPage } from '@/components/events-ticketing-pages'
import { PlatformCountriesPage, PlatformDistributionChannelsPage, PlatformEventCategoriesPage, PlatformSettingsPage, PlatformSponsorsPage, PlatformSubdivisionsPage } from '@/components/platform-admin-pages'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const moduleLabels: Record<string, string> = {
  accounts: 'Accounts',
  events: 'Events',
  ticketing: 'Ticketing',
  staff: 'Staff & access',
  platform: 'Platform',
  commerce: 'Commerce',
  marketplace: 'Marketplace',
  documents: 'Documents',
  contracts: 'Contracts',
  invoices: 'Invoices',
}

const resourceLabels: Record<string, string> = {
  overview: 'Overview',
  users: 'Users',
  organizations: 'Organizations',
  'org-users': 'Organization users',
  directory: 'Event management',
  verify: 'Verify ticket',
  kyc: 'KYC review',
  admins: 'Admin users',
  roles: 'Roles & permissions',
  flags: 'Feature flags',
  settings: 'Platform settings',
  sponsors: 'Sponsors',
  countries: 'Countries',
  subdivisions: 'Subdivisions',
  'distribution-channels': 'Distribution channels',
  'event-categories': 'Event categories',
  taxes: 'Tax rules',
  fees: 'Fee rules',
  commerce: 'Commerce settings',
  exemptions: 'Tax exemptions',
  payouts: 'Payouts',
  vendors: 'Vendors',
  venues: 'Venues',
  claims: 'Venue claims',
  reconciliation: 'Organization reconciliation',
  identities: 'Legal identities',
  clauses: 'Document clauses',
  templates: 'Contract templates',
  'document-settings': 'Document settings',
  artifacts: 'Document artifacts',
  retention: 'Retention policies',
  'render-jobs': 'Catalog render jobs',
  'operations-render-jobs': 'Operations render jobs',
  contracts: 'Contracts',
  lifecycle: 'Lifecycle events',
  'vendor-contract-backfills': 'Vendor contract backfills',
  'venue-contract-backfills': 'Venue contract backfills',
  'contract-reconciliation': 'Contract reconciliation',
  list: 'Invoices',
}

const overviewResources: Record<string, Array<{ label: string; section: string }>> = {
  accounts: [
    { label: 'Users', section: 'users' }, { label: 'Organizations', section: 'organizations' },
    { label: 'Organization users', section: 'org-users' }, { label: 'Venues', section: 'venues' },
    { label: 'Vendors', section: 'vendors' }, { label: 'KYC review', section: 'kyc' },
  ],
  events: [{ label: 'Manage events', section: 'directory' }],
  ticketing: [{ label: 'Verify ticket', section: 'verify' }],
  staff: [{ label: 'Admin users', section: 'admins' }, { label: 'Roles & permissions', section: 'roles' }, { label: 'Feature flags', section: 'flags' }],
  platform: [
    { label: 'Platform settings', section: 'settings' }, { label: 'Sponsors', section: 'sponsors' },
    { label: 'Countries', section: 'countries' }, { label: 'Subdivisions', section: 'subdivisions' },
    { label: 'Distribution channels', section: 'distribution-channels' }, { label: 'Event categories', section: 'event-categories' },
  ],
  commerce: [
    { label: 'Tax rules', section: 'taxes' }, { label: 'Fee rules', section: 'fees' },
    { label: 'Commerce settings', section: 'commerce' }, { label: 'Tax exemptions', section: 'exemptions' },
    { label: 'Payouts', section: 'payouts' },
  ],
  marketplace: [
    { label: 'Vendors', section: 'vendors' }, { label: 'Venues', section: 'venues' },
    { label: 'Venue claims', section: 'claims' }, { label: 'Organization reconciliation', section: 'reconciliation' },
  ],
  documents: [
    { label: 'Legal identities', section: 'identities' }, { label: 'Document clauses', section: 'clauses' },
    { label: 'Contract templates', section: 'templates' }, { label: 'Document settings', section: 'document-settings' },
    { label: 'Artifacts', section: 'artifacts' }, { label: 'Retention policies', section: 'retention' },
    { label: 'Catalog render jobs', section: 'render-jobs' }, { label: 'Contracts', section: 'contracts' },
    { label: 'Lifecycle events', section: 'lifecycle' }, { label: 'Operations render jobs', section: 'operations-render-jobs' },
    { label: 'Vendor contract backfills', section: 'vendor-contract-backfills' },
    { label: 'Venue contract backfills', section: 'venue-contract-backfills' },
    { label: 'Contract reconciliation', section: 'contract-reconciliation' },
  ],
  contracts: [
    { label: 'Contracts', section: 'contracts' }, { label: 'Legal identities', section: 'identities' },
    { label: 'Document clauses', section: 'clauses' }, { label: 'Contract templates', section: 'templates' },
    { label: 'Document settings', section: 'document-settings' }, { label: 'Artifacts', section: 'artifacts' },
    { label: 'Retention policies', section: 'retention' }, { label: 'Catalog render jobs', section: 'render-jobs' },
    { label: 'Lifecycle events', section: 'lifecycle' }, { label: 'Operations render jobs', section: 'operations-render-jobs' },
    { label: 'Vendor contract backfills', section: 'vendor-contract-backfills' },
    { label: 'Venue contract backfills', section: 'venue-contract-backfills' },
    { label: 'Contract reconciliation', section: 'contract-reconciliation' },
  ],
  invoices: [{ label: 'Invoices', section: 'list' }],
}

export function AdminModulePage() {
  const params = useParams({ strict: false })
  const { pathname } = useLocation()
  const pathParts = pathname.split('/').filter(Boolean)
  const module = params.module ?? pathParts[1]
  const section = params.section ?? pathParts[2]
  if (module === 'organizations' && section) return <OrganizationDetailsPage organizationId={section} />
  if (module === 'accounts' && section === 'organizations') return <AccountsOrganizationsPage />
  if (module === 'accounts' && section === 'org-users') return <AccountsOrganizationUsersPage />
  if (module === 'accounts' && section === 'venues') return <AccountsVenuesPage />
  if (module === 'accounts' && section === 'vendors') return <AccountsVendorsPage />
  if (module === 'events' && section === 'directory') return <AdminEventsPage />
  if (module === 'ticketing' && section === 'verify') return <TicketVerificationPage />
  if ((module === 'documents' || module === 'contracts') && section === 'contracts') return <ContractsPage />
  if (module === 'invoices' && section === 'list') return <InvoicesPage />
  if (module === 'platform' && section === 'settings') return <PlatformSettingsPage />
  if (module === 'platform' && section === 'countries') return <PlatformCountriesPage />
  if (module === 'platform' && section === 'subdivisions') return <PlatformSubdivisionsPage />
  if (module === 'platform' && section === 'distribution-channels') return <PlatformDistributionChannelsPage />
  if (module === 'platform' && section === 'event-categories') return <PlatformEventCategoriesPage />
  if (module === 'platform' && section === 'sponsors') return <PlatformSponsorsPage />
  if (section === 'overview') {
    const links = overviewResources[module ?? ''] ?? []
    return <section className="space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{moduleLabels[module ?? ''] ?? module}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Choose an area to manage in {moduleLabels[module ?? '']?.toLowerCase() ?? 'this module'}.</p></div>
      <Card><CardHeader><CardTitle>{moduleLabels[module ?? ''] ?? module} pages</CardTitle></CardHeader><CardContent><ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{links.map((item) => {
        const to = module === 'contracts' ? `/app/documents/${item.section}` : `/app/${module}/${item.section}`
        return <li key={item.section}><Link to={to as never} className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"><span>{item.label}</span><span aria-hidden="true" className="text-ink-muted">↗</span></Link></li>
      })}</ul></CardContent></Card>
    </section>
  }
  const title = resourceLabels[section ?? ''] ?? section ?? 'Module overview'

  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {moduleLabels[module ?? ''] ?? module}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-ink-muted">This module is ready for API integration.</p>
    </section>
  )
}
