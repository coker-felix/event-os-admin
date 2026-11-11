---
goal: Community moderation module in the admin console (Phase 1)
version: 1.0
date_created: 2026-11-10
last_updated: 2026-11-10
owner: Event OS admin frontend
status: Planned
tags: [feature, community, moderation]
---

# Community Admin (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Community nav module (Reports, Appeals, Blueprints, Suspensions, Badges, Skills) from `docs/specs/2026-11-10-community-admin.md`.

**Architecture:** `src/services/admin-community.ts` holds the HTTP calls. Page components live in `src/features/community/`. Thin file routes go under `src/routes/app/_dashboard/community/`. The nav entry goes in `src/components/root-layout.tsx`.

**Tech Stack:** React 19, TypeScript, TanStack Router/Query/Table, shared `src/components/ui`, Playwright (`e2e/`).

## Global Constraints

- **Prerequisite:** backend plan `event-os-backend/docs/superpowers/plans/2026-11-10-community-phase-1.md` Tasks 5, 9 and 9b. E2e tests use Playwright route mocks, following `e2e/organization-callouts.spec.ts`, so they don't need a live backend.
- Follow `docs/frontend-ui-rules.md` and AGENTS.md exactly (list-page layout, `FilterTabs`, `app-icon-action`, `AppPagination`, `AppDatePicker`, `formatDate`, dialogs that don't close on backdrop click, explicit empty/null states).
- These tables paginate server-side through `limit`/`offset`/`total` (spec: Data and errors).
- Every moderation dialog requires a reason before submit.

## Review Focus

- Row-action qualification rules (spec tables) per status.
- Appeal "different moderator" guard in both the UI and the error path.
- 403 renders a no-access state, never a generic crash.

---

### Task 1: Service and types

**Files:**
- Create: `src/services/admin-community.ts`

**Interfaces:** types `CommunityReport`, `TargetPreview`, `ModerationActionInput`, `Appeal`, `AdminBlueprint`, `Suspension`, `BadgeHolder`, `Skill`, `Page<T> = { items: T[]; total: number }`; functions `listReports({ status, q, limit, offset })`, `moderate(input)`, `listAppeals`, `decideAppeal(id, { decision, note })`, `listBlueprints`, `listSuspensions`, `listBadges(badge)`, `setBadge({ userId, badge, grant })`, `listSkills` (admin route `/api/admin/community/skills`), `upsertSkill(id, { name, slug })`, `getAdminProfile(userId)`. Each normalizes missing arrays to `[]` and a missing `total` to 0.

- [ ] **Step 1:** Implement with `authenticatedAdminFetch`, matching `admin-planning.ts`. Write the normalizers as pure exported functions.
- [ ] **Step 2:** Run `pnpm typecheck` Expected: PASS
- [ ] **Step 3:** Commit `feat(community): admin community service`

### Task 2: Navigation, routes and the no-access state

**Files:**
- Modify: `src/components/root-layout.tsx` (module `community` and icons for the six routes)
- Create: `src/routes/app/_dashboard/community/{index.tsx (redirects to reports),reports.tsx,appeals.tsx,blueprints.tsx,suspensions.tsx,badges.tsx,skills.tsx}`
- Create: `src/features/community/no-access.tsx`, `src/features/community/use-community-errors.ts` (maps backend `reason` to the spec messages; falls back to the status only when `reason` is missing)
- Test: `e2e/community-access.spec.ts`

- [ ] **Step 1:** Write a failing e2e test: every route returns 403 `{reason: "forbidden"}` from the mocked API → no-access state (AD-1); a 409 `{reason: "duplicate"}` and a 409 `{reason: "slug_taken"}` show different messages; the nav shows the Community module with six items.
- [ ] **Step 2:** Run `pnpm e2e -- community-access` Expected: FAIL
- [ ] **Step 3:** Implement. Route files only render the feature page.
- [ ] **Step 4:** Run the same command. Expected: PASS
- [ ] **Step 5:** Commit `feat(community): admin community navigation and routes`

### Task 3: Moderation dialogs (shared)

**Files:**
- Create: `src/features/community/moderation-action-dialog.tsx` (action, reason ≤500 required, optional `reportId`), `src/features/community/action-rules.ts` (pure functions deciding which actions a row shows)
- Test: covered by Tasks 4 and 5 e2e tests; `action-rules.ts` is checked through those flows

- [ ] **Step 1:** Implement `availableActions(row)` from the spec's Reports table, and the dialog (submit disabled until a reason is entered, AD-3).
- [ ] **Step 2:** Run `pnpm typecheck` Expected: PASS
- [ ] **Step 3:** Commit `feat(community): moderation action dialog and rules`

### Task 4: Reports page

**Files:**
- Create: `src/features/community/reports-page.tsx`, `src/features/community/report-side-panel.tsx`
- Test: `e2e/community-reports.spec.ts`

- [ ] **Step 1:** Write failing e2e tests: Open tab by default; Hide only on published targets and Restore only on hidden (AD-2); Dismiss removes the row from Open and leaves the target status unchanged (AD-4); empty queue copy (AD-8); the pagination label uses the server total (AD-9); the side panel lists every report on the target.
- [ ] **Step 2:** Run `pnpm e2e -- community-reports` Expected: FAIL
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS
- [ ] **Step 5:** Commit `feat(community): reports queue`

### Task 5: Appeals and Blueprints pages

**Files:**
- Create: `src/features/community/appeals-page.tsx`, `src/features/community/decide-appeal-dialog.tsx`, `src/features/community/blueprints-page.tsx`
- Test: `e2e/community-appeals.spec.ts`, `e2e/community-blueprints.spec.ts`

- [ ] **Step 1:** Write failing e2e tests: Decide is disabled with the tooltip when the original moderator id equals the signed-in admin, and a mocked 403 shows the same text (AD-5); Blueprints filter tabs and row-action qualification; withdraw requires a reason.
- [ ] **Step 2:** Run `pnpm e2e -- community-appeals community-blueprints` Expected: FAIL
- [ ] **Step 3:** Implement. The current admin id comes from the existing admin auth store.
- [ ] **Step 4:** Run the same command. Expected: PASS
- [ ] **Step 5:** Commit `feat(community): appeals and blueprint moderation`

### Task 6: Suspensions, Badges, Skills

**Files:**
- Create: `src/features/community/suspensions-page.tsx`, `suspend-user-dialog.tsx`, `badges-page.tsx`, `grant-badge-dialog.tsx`, `skills-page.tsx`, `skill-dialog.tsx`, `user-picker.tsx` (wraps the existing admin users directory search)
- Test: `e2e/community-people.spec.ts`

- [ ] **Step 1:** Write failing e2e tests: Suspend author and Unsuspend post `targetType: user`; the suspension side panel loads the admin profile; suspend with an end date sends `YYYY-MM-DD` and the list shows `13th Jul 26` (AD-6); a null `until` shows "No end date"; grant and revoke both badge types, filtered by tab; skills load while the community flag is off (mocked); skill slug validation and 409 copy, with the dialog staying open (AD-7); no delete action on skills.
- [ ] **Step 2:** Run `pnpm e2e -- community-people` Expected: FAIL
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS
- [ ] **Step 5:** Commit `feat(community): suspensions, badges and skills`

### Task 7: Verification

- [ ] Run `pnpm build && pnpm e2e`. Expected: all pass.
- [ ] Against staging, work one real report end to end (hide → appeal from event-os-org → reverse by a second admin).
