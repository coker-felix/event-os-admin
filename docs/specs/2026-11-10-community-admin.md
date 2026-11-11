# Spec: Community moderation in the admin console

Status: proposed (awaiting review)
Date: 2026-11-10
Backend spec: `event-os-backend/docs/specs/community.md` (the source of truth for rules, states and endpoints)
Plan: `plan/feature-community-admin-1.md`
Sibling specs: `event-os-org/docs/specs/2026-11-10-community-organization.md`, `event-os-website/docs/superpowers/specs/2026-11-10-community-section-design.md`

## Objective

Platform staff with `admin.community.moderate` keep the community safe and
seeded: they work the report queue, decide appeals, manage suspensions, grant founding-member and staff badges and maintain the skill taxonomy. Admins don't author
community content. Staff blueprints are published from a staff organization
in the workspace app.

## Scope

In: one new nav module, **Community**, with six pages. Turning community on
and off uses the existing feature-flag page (flags `community_blueprints`,
`community_qa`, `community_crew_call`, `community_network`); no new flag UI.

Out: authoring blueprints or posts; community analytics (there's no endpoint
yet, so no Overview page); editing profiles on a user's behalf.

## Navigation

Add module `{ id: 'community', label: 'Community' }` to `root-layout.tsx`,
with an icon for each item:

| Item | Route | Purpose |
|---|---|---|
| Reports | `/app/community/reports` | The moderation queue (default landing page) |
| Appeals | `/app/community/appeals` | Decide appeals |
| Blueprints | `/app/community/blueprints` | Find any blueprint by status and act on it |
| Suspensions | `/app/community/suspensions` | Active suspensions; unsuspend |
| Badges | `/app/community/badges` | Grant and revoke the founding-member and staff badges |
| Skills | `/app/community/skills` | Maintain the skill taxonomy |

The admin app shows every nav item to every signed-in admin. Permission is
enforced by the API, so each page renders a **no-access state** on 403
("You need the community moderation permission.") instead of an error.

## Pages

All pages follow `docs/frontend-ui-rules.md`: one title and one supporting
sentence; filters outside and before a results card that holds only the table
and `AppPagination` ("Showing 1 to 10 of 47"); `FilterTabs` for fewer than
five choices; `app-icon-action` row actions shown only when their endpoint
exists and the row qualifies; dialogs close only by the close control or
Escape; dates through `formatDate`; statuses as semantic badges; explicit
loading, error, empty and no-results states.

### Reports

- Filter: `FilterTabs` Open (default) · Actioned · Dismissed. **All** is left
  out on purpose because the queue is worked by status. Search box: target
  title.
- Columns: Target (monogram, `targetPreview.title`, type and author name
  underneath), Reason, Open reports on this target (right-aligned count),
  Target status (badge), Reported (date).
- Row actions. Each opens a dialog with a required reason ≤500 and posts
  `POST /api/admin/community/moderation-actions` with `report_id`:

| Action | Shown when |
|---|---|
| Hide | target status is `published` |
| Restore | target status is `hidden` |
| Withdraw (blueprints) | target is a blueprint and not `withdrawn` |
| Suspend author | `targetPreview.authorSuspended` is false |
| Dismiss | report is `open` |

- "Suspend author" posts `suspend_user` with `targetType: user`,
  `targetId: targetPreview.authorUserId` and the `reportId`.
- A row opens a side panel with the full `targetPreview.excerpt` (for profile
  targets, the full profile from `GET /api/admin/community/profiles/{userId}`), a link to
  the public page on the website (only for visible targets), and every report
  on the same target.

### Appeals

- Filter: `FilterTabs` Open (default) · Upheld · Reversed.
- Columns: User, Original action (badge), Reason given, Appeal note
  (truncated, full text in the side panel), Submitted.
- Row action **Decide** opens a dialog: Uphold or Reverse, with a required
  note. If the current admin took the original action, the action is
  disabled with the tooltip "Another moderator must decide this appeal"
  (compare `appeal.action.moderatorUserId` with the signed-in admin's id). The
  backend enforces this too; a 403 shows the same text.

### Blueprints

- Filter: `FilterTabs` All (default) · Published · Hidden · Withdrawn.
  Search: title.
- Columns: Blueprint (title, author underneath), Credited org, Version, Forks
  (right-aligned), Status, Published.
- Row actions: Hide, Restore, Withdraw. They use the same dialogs and
  qualification rules as Reports, without `report_id`.

### Suspensions

- List from `GET /api/admin/community/suspensions`. Columns: User, Reason,
  Until ("No end date" when null), Suspended by, Since.
- Row action **Unsuspend** (dialog with a required reason) posts
  `unsuspend_user` with `targetType: user`.
- Clicking a row opens a side panel from `GET /api/admin/community/profiles/{userId}`
  (the profile in any state, plus suspension details).
- Toolbar action **Suspend a user**: a dialog with a user picker (the existing
  admin users directory search), reason and optional end date
  (`AppDatePicker`, which must be a future date). It posts a `suspend_user`
  moderation action with `until` as `YYYY-MM-DD`.

### Badges

- List from `GET /api/admin/community/badges?badge=founding_member`, with
  FilterTabs Founding member (default) · Staff.
- Toolbar action **Grant badge**: a dialog with a user picker, the badge
  (founding_member or staff) and a confirmation.
- Row action **Revoke** (confirmation dialog).

### Skills

- List from `GET /api/admin/community/skills` (works while the feature is off, for pre-launch setup). Columns: Name, Slug.
- Toolbar **Add skill** and row action **Edit** open a dialog with name and
  slug (lowercase, `a-z0-9_`, unique). A 409 shows "That slug is already in
  use".
- No delete action: the endpoint doesn't exist.

## Data and errors

- New `src/services/admin-community.ts`, using `authenticatedAdminFetch`
  like the other `admin-*.ts` services. Typed DTOs mirror the backend
  lowerCamelCase protojson. Optional fields are typed optional and given
  fallbacks in the UI.
- Pagination: the community admin lists support `limit` and `offset`, so
  these tables page **server-side**. This is an exception to the client-side
  default in the UI rules, allowed because the endpoint honors it. Page size
  changes reset to page 1.
- Errors switch on the backend `reason` (backend Error contract), not on the
  status: `forbidden` → no-access state (page) or toast (action);
  `not_found` → "This item no longer exists", then refresh; `duplicate` or
  `invalid_state` → "Already done or changed", then refresh; `slug_taken` →
  "That slug is already in use"; `not_appealable` → "This appeal can't be
  decided"; `invalid_input` → the field message; network, 5xx or unknown →
  error state with retry.
- After any action, invalidate the list and refresh the side panel.

## Later phases (outline)

- **Phase 2:** Channels page (create, edit, archive, reorder); report targets
  extended to threads and replies; thread pin and lock actions.
- **Phase 3:** report target `listing`; a Crew Call listings page (view,
  hide, cancel).
- **Phase 4:** Groups moderation; file blueprint scan status.

## Acceptance tests

| ID | Scenario | Expected |
|---|---|---|
| AD-1 | Admin without permission opens any community page (`reason: forbidden`) | No-access state; nothing crashes |
| AD-2 | Hide is shown only for published targets, Restore only for hidden | As described |
| AD-3 | Action without a reason | Submit disabled |
| AD-4 | Dismiss | Report leaves the Open tab; target status unchanged |
| AD-5 | Appeal decided by the original moderator | Decide disabled with tooltip; forced call shows the same message |
| AD-6 | Suspend with an end date | Date sent as `YYYY-MM-DD`, shown as `13th Jul 26` |
| AD-7 | Skill slug collision (`reason: slug_taken`) | "That slug is already in use"; dialog stays open |
| AD-8 | Empty queue | Explicit empty state ("No open reports") |
| AD-9 | Pagination | "Showing x to y of total" comes from the server `total` |
