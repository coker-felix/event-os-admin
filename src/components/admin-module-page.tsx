import { useParams } from '@tanstack/react-router'
import { AccountsOrganizationUsersPage, AccountsOrganizationsPage, AccountsVendorsPage, AccountsVenuesPage } from '@/components/accounts-directory-pages'
import { EventsDirectoryPage, TicketVerificationPage } from '@/components/events-ticketing-pages'

const moduleLabels: Record<string, string> = {
  accounts: 'Accounts',
  events: 'Events',
  ticketing: 'Ticketing',
  staff: 'Staff & access',
  platform: 'Platform',
  commerce: 'Commerce',
  marketplace: 'Marketplace',
  documents: 'Documents',
}

const resourceLabels: Record<string, string> = {
  users: 'Users',
  organizations: 'Organizations',
  'org-users': 'Organization users',
  directory: 'Published events',
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
}

export function AdminModulePage() {
  const { module, section } = useParams({ strict: false })
  if (module === 'accounts' && section === 'organizations') return <AccountsOrganizationsPage />
  if (module === 'accounts' && section === 'org-users') return <AccountsOrganizationUsersPage />
  if (module === 'accounts' && section === 'venues') return <AccountsVenuesPage />
  if (module === 'accounts' && section === 'vendors') return <AccountsVendorsPage />
  if (module === 'events' && section === 'directory') return <EventsDirectoryPage />
  if (module === 'ticketing' && section === 'verify') return <TicketVerificationPage />
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
