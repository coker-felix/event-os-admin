# Organization administration workflows

The Admin dashboard treats an organization as a business principal that can hold any combination of `organize`, `vend`, and `host` capabilities. Capability status and KYB status are independent. A capability starts pending and grants no scoped operational permissions until active.

## Create and qualify an organization

1. Create or select the consumer user who will own the organization.
2. Create the organization with owner, contact/address details, and one or more capabilities.
3. Add any later capability from organization detail. Identity creates the owner's membership for that capability scope.
4. Upload KYB evidence through Documents. The browser submits opaque artifact IDs, and evidence must have a clean scan before KYB submission.
5. A reviewer records an approve/reject decision with a reason. An approved capability can then be activated or suspended independently.

Create-user, create-organization, add-capability, and KYB-submit calls use one client-generated UUID idempotency key per submission. A retry reuses the same key. A changed submission gets a new key.

## Manage organization access

The available member scopes follow organization capabilities: `organize` maps to `organizer`, `vend` maps to `vendor`, and `host` maps to `venue`. Member and invite list queries and mutations always include the scope. One user can hold distinct roles in different scopes of the same organization. The primary owner cannot be changed or removed through scoped member actions. Invites use phone destinations until an email delivery contract exists.

The members view can resolve each roster member's effective permissions for the selected scope. Identity computes the result from current organization status, capability state, membership, and role grants; an absent or inactive authorization state returns no permissions.

## Manage organization resources

Organization detail provides organization contact/address edits, organization suspend/reactivate, and capability suspension. These state changes require an audit reason; suspension asks for confirmation. Mutations refresh the organization detail and organization directory queries.

Vendor profiles are organization-owned and may have sibling profiles under one organization. Service areas are stored per profile, with a maximum of 50 entries. `ProfileStats` are server-derived and read-only. Venues are likewise managed under the owning organization and archived instead of hard-deleted.

Callouts are created for events belonging to the selected organization. Open callouts may be edited only before the first vendor response. Closing and cancellation use the existing global moderation lifecycle operations; cancellation requires confirmation and preserves the history.

## Admin API contracts

The Admin API shapes are documented in [`openapi.yaml`](../openapi.yaml). Organization detail uses `GET` and `PATCH /api/admin/organizations/{id}`; status changes use `PATCH /api/admin/organizations/{id}/status`; effective permissions use `GET /api/admin/organizations/{id}/permissions?actorId=...&scope=...`. Membership and invite operations carry an explicit `scope`. Organization vendor profiles and venues use organization filters/path parameters. Internal Vendors response-count authorization is service-to-service only and is not exposed through this API.
