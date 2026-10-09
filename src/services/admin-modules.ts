import type { AdminServiceModule } from '@/types/admin-modules'

/** API surface inventory from openapi.yaml. This file intentionally performs no requests. */
export const adminServiceModules = [
  {
    id: 'accounts',
    openApiTags: ['Users', 'KYC'],
    resources: ['users', 'kyc-profiles'],
  },
  {
    id: 'staff',
    openApiTags: ['Admins & Roles', 'Feature Flags'],
    resources: ['admins', 'roles', 'permissions', 'feature-flags'],
  },
  {
    id: 'platform',
    openApiTags: ['Platform Config', 'Sponsors', 'Catalogs'],
    resources: ['configuration', 'sponsors', 'countries', 'subdivisions', 'distribution-channels', 'event-categories'],
  },
  {
    id: 'commerce',
    openApiTags: ['Tax & Commerce', 'Payouts'],
    resources: ['tax-rules', 'fee-rules', 'commerce-settings', 'tax-exemptions', 'payouts'],
  },
  {
    id: 'marketplace',
    openApiTags: ['Vendors & Venues'],
    resources: ['vendors', 'venues', 'venue-claims', 'organization-reconciliation'],
  },
  {
    id: 'documents',
    openApiTags: ['Document Catalog', 'Document Operations', 'Contract Backfills'],
    resources: [
      'legal-identities',
      'clauses',
      'contract-templates',
      'document-settings',
      'artifacts',
      'retention-policies',
      'render-jobs',
      'contracts',
      'lifecycle-events',
      'vendor-contract-backfills',
      'venue-contract-backfills',
      'contract-reconciliation',
    ],
  },
] as const satisfies readonly AdminServiceModule[]
