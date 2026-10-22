import { useLocation, useParams } from '@tanstack/react-router'
import { AccountsOrganizationUsersPage, AccountsOrganizationsPage, AccountsVendorsPage, AccountsVenuesPage, MarketplaceReconciliationPage, OrganizationDetailsPage } from '@/components/accounts/accounts-directory-pages'
import { AdminEventsPage } from '@/components/events/admin-events-page'
import { ContractsPage } from '@/components/contracts/contracts-page'
import { InvoicesPage } from '@/components/invoices/invoices-page'
import { CommerceFeeRulesPage, CommercePayoutsPage, CommerceSettingsPage, CommerceTaxExemptionsPage, CommerceTaxRulesPage } from '@/components/commerce/commerce-admin-pages'
import { TicketVerificationPage } from '@/components/events/events-ticketing-pages'
import { PlatformCountriesPage, PlatformDistributionChannelsPage, PlatformEventCategoriesPage, PlatformSettingsPage, PlatformSponsorsPage, PlatformSubdivisionsPage } from '@/components/platform/platform-admin-pages'
import { ModuleAnalyticsOverview } from '@/components/module-analytics-overview'

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
  if (module === 'marketplace' && section === 'vendors') return <AccountsVendorsPage />
  if (module === 'marketplace' && section === 'venues') return <AccountsVenuesPage />
  if (module === 'marketplace' && section === 'claims') return <AccountsVenuesPage initialTab="claims" />
  if (module === 'marketplace' && section === 'reconciliation') return <MarketplaceReconciliationPage />
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
  if (module === 'commerce' && section === 'taxes') return <CommerceTaxRulesPage />
  if (module === 'commerce' && section === 'fees') return <CommerceFeeRulesPage />
  if (module === 'commerce' && section === 'commerce') return <CommerceSettingsPage />
  if (module === 'commerce' && section === 'exemptions') return <CommerceTaxExemptionsPage />
  if (module === 'commerce' && section === 'payouts') return <CommercePayoutsPage />
  const analyticsModule = module === 'documents' ? 'contracts' : module
  const analyticsModules = ['accounts', 'events', 'ticketing', 'commerce', 'marketplace', 'contracts', 'invoices', 'staff', 'platform']
  if (section === 'overview' || (!section && analyticsModules.includes(analyticsModule ?? ''))) {
    if (analyticsModule && analyticsModules.includes(analyticsModule)) {
      return <ModuleAnalyticsOverview module={analyticsModule as 'accounts' | 'events' | 'ticketing' | 'commerce' | 'marketplace' | 'contracts' | 'invoices' | 'staff' | 'platform'} title={moduleLabels[module ?? ''] ?? module ?? 'Module'} />
    }
    return <section className="space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{moduleLabels[module ?? ''] ?? module}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Choose an area to manage in {moduleLabels[module ?? '']?.toLowerCase() ?? 'this module'}.</p></div>
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
