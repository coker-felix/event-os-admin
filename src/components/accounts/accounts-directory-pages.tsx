import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth";
import { AppIconAction } from "@/components/ui/app-icon-action";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CaretDown, Check } from "@phosphor-icons/react";
import { listAdminConsumers } from "@/services/admin-users";
import { getAdminKycProfile, listAdminKycProfiles } from "@/services/admin-kyc";
import { listCountries } from "@/services/admin-platform";
import { OrganizationFeatureFlagsCard } from "@/components/accounts/organization-feature-flags-card";
import { formatDate } from "@/lib/date-format";
import { formatMoney } from "@/lib/money-format";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createAdminOrganization,
  createAdminVendor,
  createDirectoryVenue,
  decideVenueClaim,
  getAdminVendor,
  getOrganizationCommerceProfile,
  getVenueOwnershipHistory,
  listAdminOrganizations,
  listOrganizationMembers,
  listPendingVenueClaims,
  listVenueDirectory,
  listVenueOrganizationReconciliation,
  listVendorDirectory,
  listVendorCatalogServices,
  patchDirectoryVenue,
  resolveVenueOrganization,
  setVenueStatus,
  setVendorStatus,
  updateVendorTier,
  type AdminVenueClaim,
  type AdminOrganization,
  type VenueDirectoryEntry,
  type VendorDirectoryEntry,
} from "@/services/admin-account-directory";

const vendorKey = ["qk-admin-vendor-directory"] as const;
const venueKey = ["qk-admin-venue-directory"] as const;
const venueOrgQueueKey = ["qk-admin-venue-org-reconciliation"] as const;
const venueClaimsKey = ["qk-admin-venue-claims"] as const;
const organizationsKey = ["qk-admin-organizations"] as const;
const vendorOrganizationsKey = [...organizationsKey, "vendor"] as const;
const accountPickerKey = ["qk-admin-consumers"] as const;

function ErrorMessage({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {children}
    </p>
  );
}

function OrganizationMemberStatus({ status }: { status?: string | null }) {
  const normalized = (status || "unknown").trim().toLowerCase();
  const label = normalized.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const className = normalized === "active"
    ? "bg-success-soft text-success"
    : normalized === "pending" || normalized === "pending_approval"
      ? "bg-warning-soft text-warning"
      : normalized === "suspended" || normalized === "inactive"
        ? "bg-danger-soft text-danger"
        : "";
  return <Badge className={className} variant={className ? "default" : "outline"}>{label}</Badge>;
}

function safeHttpUrl(value?: string | null) {
  try {
    const parsed = new URL(value || "");
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function Identity({ name, secondary }: { name: string; secondary?: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
      >
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{name}</span>
        <span className="block truncate text-xs text-ink-muted">
          {secondary || "Details unavailable"}
        </span>
      </span>
    </div>
  );
}

function OrganizationTypeBadge({ type }: { type?: string | null }) {
  const label = type ? type.charAt(0).toUpperCase() + type.slice(1) : "Unknown";
  if (type === "organizer")
    return <Badge className="bg-brand-soft text-brand">{label}</Badge>;
  if (type === "vendor")
    return <Badge className="bg-success-soft text-success">{label}</Badge>;
  if (type === "venue")
    return <Badge className="bg-warning-soft text-warning">{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
}

function ExistingAccountPicker({
  value,
  onChange,
  enabled,
  label = "Account",
}: {
  value: string;
  onChange: (id: string) => void;
  enabled: boolean;
  label?: string;
}) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const accountsQuery = useQuery({
    queryKey: accountPickerKey,
    queryFn: () => listAdminConsumers(session!.token),
    enabled: Boolean(enabled && session?.token),
  });
  const accounts = accountsQuery.data?.users ?? [];
  const selected = accounts.find((account) => account.id === value);
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
              disabled={
                accountsQuery.isLoading ||
                accountsQuery.isError ||
                accounts.length === 0
              }
            />
          }
        >
          {accountsQuery.isLoading
            ? "Loading accounts…"
            : selected
              ? selected.name ||
                selected.email ||
                selected.phone ||
                "Unnamed user"
              : "Select an account"}
          <CaretDown aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-80 max-w-[calc(100vw-3rem)] p-0">
          <Command>
            <CommandInput placeholder="Search name, email, or phone…" />
            <CommandList>
              <CommandEmpty>No matching user accounts.</CommandEmpty>
              <CommandGroup>
                {accounts.map((account) => {
                  const primary = account.name || "Unnamed user";
                  const contacts = [account.email, account.phone]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <CommandItem
                      key={account.id}
                      value={`${primary} ${account.email || ""} ${account.phone || ""} ${account.id}`}
                      onSelect={() => {
                        onChange(account.id);
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{primary}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {contacts || account.id}
                        </span>
                      </span>
                      {value === account.id && (
                        <Check aria-hidden="true" className="ml-auto" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {accountsQuery.isError && (
        <FieldDescription role="alert" className="text-danger">
          Could not load user accounts: {accountsQuery.error.message}
        </FieldDescription>
      )}
      {accountsQuery.isSuccess && accounts.length === 0 && (
        <FieldDescription>
          No user accounts are available to select.
        </FieldDescription>
      )}
    </Field>
  );
}

function CreateOrganizationSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"organizer" | "vendor" | "venue">(
    "organizer",
  );
  const mutation = useMutation({
    mutationFn: () =>
      createAdminOrganization(session!.token, {
        owner_id: accountId,
        name: name.trim(),
        type,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organizationsKey });
        setName("");
      setType("organizer");
      onOpenChange(false);
    },
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Create organization</SheetTitle>
          <SheetDescription>
            Create an organization for an existing account. That account will be
            assigned as its owner.
          </SheetDescription>
        </SheetHeader>
        <form
          id="create-admin-organization"
          className="flex-1 px-6 pb-6"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <FieldGroup className="gap-4">
            <ExistingAccountPicker
              value={accountId}
              onChange={setAccountId}
              enabled={open}
              label="Organization owner account"
            />
            <Field>
              <FieldLabel>Organization name</FieldLabel>
              <Input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Organization type</FieldLabel>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as typeof type)}
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"
              >
                <option value="organizer">Event Organizer/Planner</option>
                <option value="vendor">Vendor</option>
                <option value="venue">Venue Management</option>
              </select>
            </Field>
            {mutation.isError && (
              <ErrorMessage>{mutation.error.message}</ErrorMessage>
            )}
          </FieldGroup>
        </form>
        <SheetFooter className="border-t border-line">
          <Button
            type="submit"
            form="create-admin-organization"
            disabled={mutation.isPending || !accountId || !name.trim()}
          >
            {mutation.isPending ? "Creating…" : "Create organization"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DirectoryTable<T extends { id: string }>({
  title,
  rows,
  isLoading,
  error,
  search,
  onSearch,
  emptyTitle,
  emptyMessage,
  columns,
  renderRow,
  label,
}: {
  title: string;
  rows: T[];
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearch: (value: string) => void;
  emptyTitle: string;
  emptyMessage: string;
  columns: string[];
  renderRow: (row: T) => React.ReactNode;
  label: string;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [rows, search],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize,
  );
  return (
    <>
      <div className="flex justify-end">
        <Input
          aria-label={`Search ${label}`}
          placeholder={`Search ${label}`}
          value={search}
          onChange={(event) => {
            onSearch(event.target.value);
            setPageIndex(0);
          }}
          className="sm:w-64"
        />
      </div>
      <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable
          data={visible}
          headers={columns.map((column, index) => ({
            label: column,
            className:
              column === "Capacity" || index === columns.length - 1
                ? "text-right"
                : undefined,
          }))}
          renderRow={renderRow}
          label={title}
          loading={isLoading}
          loadingMessage={`Loading ${label}…`}
          error={error}
          emptyMessage={
            search ? (
              <p className="text-sm text-ink-muted">
                No {label} match “{search}”. Try another search.
              </p>
            ) : rows.length === 0 ? (
              <div>
                <p className="text-sm font-medium text-ink">{emptyTitle}</p>
                <p className="mt-1 text-sm text-ink-muted">{emptyMessage}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No {label} on this page.</p>
            )
          }
          emptyClassName="h-32 text-center"
          containerClassName=""
          pagination={{
            pageIndex,
            pageSize,
            totalItems: filtered.length,
            onPageChange: (index) =>
              setPageIndex(Math.min(index, pageCount - 1)),
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPageIndex(0);
            },
          }}
        />
      </CardContent>
      </Card>
    </>
  );
}

interface OrganizationLinkItem {
  id: string;
  name: string;
  ownerAccountId?: string | null;
}

function ResolveOrganizationRow({
  item,
  queueKey,
  organizations,
  organizationsLoading,
  resolve,
}: {
  item: OrganizationLinkItem;
  queueKey: readonly unknown[];
  organizations?: AdminOrganization[];
  organizationsLoading?: boolean;
  resolve: (orgId: string, reason: string) => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const [organizationId, setOrganizationId] = useState("");
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () => resolve(organizationId.trim(), reason.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queueKey });
    },
  });
  return (
    <TableRow>
      <TableCell>
        <Identity
          name={item.name || "Unnamed profile"}
          secondary={`Profile ${item.id}${item.ownerAccountId ? ` · Owner ${item.ownerAccountId}` : ""}`}
        />
      </TableCell>
      <TableCell>
        <form
          className="grid gap-2 sm:grid-cols-[minmax(140px,1fr)_minmax(160px,1.4fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          {organizations ? (
            <select
              aria-label={`Managing organization for ${item.name}`}
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              required
              disabled={organizationsLoading || organizations.length === 0}
              className="h-10 min-w-0 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {organizationsLoading
                  ? "Loading organizations…"
                  : organizations.length === 0
                    ? "No organizations available"
                    : "Select an organization"}
              </option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name || organization.slug || "Unnamed organization"} · {organization.id}
                </option>
              ))}
            </select>
          ) : (
            <Input
              aria-label={`Managing organization ID for ${item.name}`}
              placeholder="Organization ID"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              required
            />
          )}
          <Input
            aria-label={`Reason for linking ${item.name}`}
            placeholder="Reason for decision"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
          <Button
            type="submit"
            size="sm"
            disabled={
              mutation.isPending || !organizationId.trim() || !reason.trim()
            }
          >
            {mutation.isPending ? "Saving…" : "Link organization"}
          </Button>
        </form>
        {mutation.isError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {mutation.error.message}
          </p>
        )}
      </TableCell>
    </TableRow>
  );
}

function OrganizationReconciliationQueue({
  title,
  description,
  items,
  loading,
  error,
  queueKey,
  organizations,
  organizationsLoading,
  organizationsError,
  resolve,
}: {
  title: string;
  description: string;
  items: OrganizationLinkItem[];
  loading: boolean;
  error: string | null;
  queueKey: readonly unknown[];
  organizations?: AdminOrganization[];
  organizationsLoading?: boolean;
  organizationsError?: string | null;
  resolve: (id: string, orgId: string, reason: string) => Promise<unknown>;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const visibleItems = items.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize,
  );
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable
          data={visibleItems}
          headers={["Profile", "Assign managing organization"]}
          renderRow={(item) => (
            <ResolveOrganizationRow
              key={item.id}
              item={item}
              queueKey={queueKey}
              organizations={organizations}
              organizationsLoading={organizationsLoading}
              resolve={(orgId, reason) => resolve(item.id, orgId, reason)}
            />
          )}
          label="organization links"
          loading={loading}
          loadingMessage="Loading organization-link queue…"
          error={error}
          emptyMessage="No organization links need review."
          emptyClassName="h-24 text-center text-sm text-ink-muted"
          containerClassName=""
          pagination={{
            pageIndex,
            pageSize,
            totalItems: items.length,
            onPageChange: (index) =>
              setPageIndex(Math.min(index, pageCount - 1)),
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPageIndex(0);
            },
          }}
        />
        {organizationsError && <p role="alert" className="px-4 py-3 text-sm text-danger">Unable to load organizations: {organizationsError}</p>}
      </CardContent>
    </Card>
  );
}

function ProfileStatusDialog({
  kind,
  profile,
  onClose,
}: {
  kind: "vendor" | "venue";
  profile: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<
    "pending_approval" | "active" | "suspended"
  >("suspended");
  const mutation = useMutation({
    mutationFn: () =>
      kind === "vendor"
        ? setVendorStatus(session!.token, profile!.id, status)
        : setVenueStatus(session!.token, profile!.id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: kind === "vendor" ? vendorKey : venueKey,
      });
      onClose();
    },
  });
  const label = kind === "vendor" ? "vendor" : "venue";
  return (
    <Dialog
      open={Boolean(profile)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change {label} status</DialogTitle>
          <DialogDescription>
            Update the status for {profile?.name || `this ${label}`}.
          </DialogDescription>
        </DialogHeader>
        <label
          htmlFor={`${kind}-status-value`}
          className="block space-y-1.5 text-sm font-medium"
        >
          New status
        </label>
        <select
          id={`${kind}-status-value`}
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"
        >
          <option value="pending_approval">Pending approval</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        {mutation.isError && (
          <ErrorMessage>{mutation.error.message}</ErrorMessage>
        )}
        <p className="text-xs text-ink-muted">
          Activation may be blocked until contract onboarding and verification
          requirements are met.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Update status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VenueClaimDecisionDialog({
  claim,
  decision,
  onClose,
}: {
  claim: AdminVenueClaim | null;
  decision: "approve" | "reject";
  onClose: () => void;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      decideVenueClaim(session!.token, claim!.id, decision, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: venueClaimsKey });
      await queryClient.invalidateQueries({ queryKey: venueKey });
      setNote("");
      onClose();
    },
  });
  return (
    <Dialog
      open={Boolean(claim)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === "approve"
              ? "Approve venue claim?"
              : "Reject venue claim?"}
          </DialogTitle>
          <DialogDescription>
            {decision === "approve"
              ? "Approval transfers venue ownership to the claimant and may open venue verification."
              : "The claim will be marked rejected."}
          </DialogDescription>
        </DialogHeader>
        <label
          htmlFor="claim-decision-note"
          className="block space-y-1.5 text-sm font-medium"
        >
          Review note{" "}
          <span className="font-normal text-ink-muted">(optional)</span>
          <textarea
            id="claim-decision-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
          />
        </label>
        {mutation.isError && (
          <ErrorMessage>{mutation.error.message}</ErrorMessage>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={decision === "reject" ? "destructive" : "default"}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Saving…"
              : decision === "approve"
                ? "Approve claim"
                : "Reject claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VenueClaimsQueue() {
  const { session } = useAuth();
  const claimsQuery = useQuery({
    queryKey: venueClaimsKey,
    queryFn: () => listPendingVenueClaims(session!.token),
    enabled: Boolean(session?.token),
  });
  const [review, setReview] = useState<{
    claim: AdminVenueClaim;
    decision: "approve" | "reject";
  } | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const claims = claimsQuery.data?.claims ?? [];
  const pageCount = Math.max(1, Math.ceil(claims.length / pageSize));
  const visibleClaims = claims.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize,
  );
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <DataTable
          data={visibleClaims}
          headers={[
            "Claimant",
            "Venue",
            "Evidence types",
            { label: "Actions", className: "text-right" },
          ]}
          label="Pending venue claims"
          loading={claimsQuery.isLoading}
          loadingMessage="Loading venue claims…"
          error={claimsQuery.isError ? claimsQuery.error.message : null}
          emptyMessage="No pending venue claims."
          pagination={{
            pageIndex,
            pageSize,
            totalItems: claims.length,
            onPageChange: (index) =>
              setPageIndex(Math.min(index, pageCount - 1)),
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPageIndex(0);
            },
          }}
          renderRow={(item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Identity
                  name={
                    item.claimantAccountId
                      ? `Claim by ${item.claimantAccountId}`
                      : "Venue claim"
                  }
                  secondary={`Claim ${item.id}`}
                />
              </TableCell>
              <TableCell>
                <Identity
                  name="Venue profile"
                  secondary={item.venueId || "Venue unavailable"}
                />
                {item.designatedOrgId && (
                  <span className="mt-1 block break-all text-xs text-ink-muted">
                    Organization: {item.designatedOrgId}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {(item.evidence ?? [])
                  .filter(Boolean)
                  .map((evidence) => evidence?.kind)
                  .filter(Boolean)
                  .join(", ") || "No evidence listed"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <AppIconAction
                    label="Approve venue claim"
                    icon={<span aria-hidden="true">✓</span>}
                    showLabel
                    onClick={() =>
                      setReview({ claim: item, decision: "approve" })
                    }
                  />
                  <AppIconAction
                    label="Reject venue claim"
                    icon={<span aria-hidden="true">×</span>}
                    onClick={() =>
                      setReview({ claim: item, decision: "reject" })
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          )}
          containerClassName=""
        />
        <VenueClaimDecisionDialog
          key={`${review?.claim.id ?? "no-claim"}-${review?.decision ?? "approve"}`}
          claim={review?.claim ?? null}
          decision={review?.decision ?? "approve"}
          onClose={() => setReview(null)}
        />
      </CardContent>
    </Card>
  );
}

function VendorTierDialog({
  vendor,
  onClose,
}: {
  vendor: VendorDirectoryEntry | null;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [tier, setTier] = useState<NonNullable<VendorDirectoryEntry["tier"]>>(
    vendor?.tier || "normal",
  );
  const mutation = useMutation({
    mutationFn: () => updateVendorTier(session!.token, vendor!.id, tier),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: vendorKey });
      onClose();
    },
  });
  return (
    <Dialog
      open={Boolean(vendor)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vendor directory tier</DialogTitle>
          <DialogDescription>
            Set the public directory tier for{" "}
            {vendor?.businessName || "this vendor"}.
          </DialogDescription>
        </DialogHeader>
        <label
          className="block space-y-1.5 text-sm font-medium"
          htmlFor="vendor-tier"
        >
          Tier
        </label>
        <select
          id="vendor-tier"
          value={tier}
          onChange={(event) => setTier(event.target.value as typeof tier)}
          className="h-10 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"
        >
          <option value="normal">Normal</option>
          <option value="verified">Verified</option>
          <option value="partnered">Partnered</option>
        </select>
        {mutation.isError && (
          <ErrorMessage>{mutation.error.message}</ErrorMessage>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save tier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateVendorSheet({
  open, onOpenChange, onCreated, organizations, organizationsLoading, organizationsError,
}: {
  open: boolean; onOpenChange: (open: boolean) => void; onCreated: (vendorId?: string) => void;
  organizations: AdminOrganization[]; organizationsLoading: boolean; organizationsError?: string;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const countriesQuery = useQuery({
    queryKey: ["qk-admin-platform-countries"],
    queryFn: () => listCountries(session!.token),
    enabled: Boolean(session?.token && open),
  });
  const configuredCountries = (countriesQuery.data?.countries ?? []).filter((item) => item.enabled);
  const [managingOrgId, setManagingOrgId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const reset = () => {
    setManagingOrgId("");
    setBusinessName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setCategory("");
    setCity("");
    setCountry("");
    setDescription("");
  };
  const mutation = useMutation({
    mutationFn: () =>
      createAdminVendor(session!.token, {
        accountId: organizations.find((organization) => organization.id === managingOrgId)?.ownerId?.trim() || "",
        managingOrgId,
        businessName: businessName.trim(),
        ...(contactName.trim() ? { contactName: contactName.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(country.trim() ? { country: country.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: vendorKey });
      onCreated(result.vendor?.id || result.id || "");
      reset();
      onOpenChange(false);
    },
  });
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:[&[data-side=right]]:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Create vendor profile</SheetTitle>
          <SheetDescription>
            Link the vendor to an existing account. A KYC case will be opened
            and the profile will remain pending approval.
          </SheetDescription>
        </SheetHeader>
        <form
          id="create-admin-vendor"
          className="flex-1 overflow-y-auto px-6 pb-6"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel>Vendor organization</FieldLabel>
              <select required value={managingOrgId} onChange={(event) => {
                const id = event.target.value;
                setManagingOrgId(id);
                const organization = organizations.find((item) => item.id === id);
                if (organization) {
                  setBusinessName(organization.name || "");
                  setEmail(organization.email || "");
                  setPhone(organization.phone || "");
                }
              }} disabled={organizationsLoading} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm">
                <option value="">{organizationsLoading ? "Loading organizations…" : organizationsError ? "Organizations unavailable" : organizations.length ? "Choose a vendor organization" : "No vendor organizations available"}</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name || organization.id} · {organization.ownerId || "no owner"}</option>)}
              </select>
              {organizationsError && <FieldDescription role="alert" className="text-danger">Could not load vendor organizations: {organizationsError}</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel>Business name</FieldLabel>
              <Input
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Contact name (optional)</FieldLabel>
              <Input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Phone (optional)</FieldLabel>
              <Input
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Category (optional)</FieldLabel>
              <Input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>City (optional)</FieldLabel>
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Country (optional)</FieldLabel>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={countriesQuery.isLoading || countriesQuery.isError || configuredCountries.length === 0}
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">{countriesQuery.isLoading ? "Loading countries…" : configuredCountries.length ? "Choose a country" : "No configured countries"}</option>
                {configuredCountries.map((item) => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}
              </select>
              {countriesQuery.isError && <FieldDescription role="alert" className="text-danger">Could not load configured countries: {countriesQuery.error.message}</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel>Description (optional)</FieldLabel>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
              />
            </Field>
            {mutation.isError && (
              <ErrorMessage>{mutation.error.message}</ErrorMessage>
            )}
          </FieldGroup>
        </form>
        <SheetFooter className="border-t border-line">
          <Button
            type="submit"
            form="create-admin-vendor"
            disabled={
              mutation.isPending ||
              !managingOrgId || !organizations.find((organization) => organization.id === managingOrgId)?.ownerId ||
              !businessName.trim() ||
              !email.trim()
            }
          >
            {mutation.isPending ? "Creating…" : "Create vendor"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AccountsVendorsPage({ initialTab = "directory" }: { initialTab?: "directory" } = {}) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: vendorKey,
    queryFn: () => listVendorDirectory(session!.token),
    enabled: Boolean(session?.token),
  });
  const organizationsQuery = useQuery({
    queryKey: vendorOrganizationsKey,
    queryFn: () => listAdminOrganizations(session!.token, "vendor"),
    enabled: Boolean(session?.token),
  });
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState<VendorDirectoryEntry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusVendor, setStatusVendor] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [createdVendorId, setCreatedVendorId] = useState<string | undefined>();
  const vendors = query.data?.vendors ?? [];
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Vendor Profiles
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Browse active public listings and manage their directory tier.The public directory shows active vendors only.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreatedVendorId(undefined);
            setCreateOpen(true);
          }}
        >
          Add vendor profile
        </Button>
      </div>
      {createdVendorId !== undefined && (
        <p
          role="status"
          className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success"
        >
          Vendor profile created and pending approval
          {createdVendorId ? ` · ID ${createdVendorId}` : ""}. A KYC case has
          been opened.
        </p>
      )}
      <Tabs defaultValue={initialTab} className="gap-5">
        <TabsContent value="directory" className="flex flex-col gap-5">
          <DirectoryTable
            title="Active vendor directory"
            rows={vendors}
            isLoading={query.isLoading}
            error={query.isError ? query.error.message : null}
            search={search}
            onSearch={setSearch}
            emptyTitle="No active vendor listings"
            emptyMessage="Add a vendor or wait for an active vendor to appear."
            columns={["Vendor", "Contact", "Email", "Phone", "Category", "Location", "Tier", "Actions"]}
            label="vendors"
            renderRow={(item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Identity
                    name={item.businessName || "Unnamed vendor"}
                    secondary={item.id}
                  />
                </TableCell>
                <TableCell>{item.contactName || "—"}</TableCell>
                <TableCell><span className="block max-w-56 truncate">{item.email || "—"}</span></TableCell>
                <TableCell>{item.phone || "—"}</TableCell>
                <TableCell>{item.category || "—"}</TableCell>
                <TableCell>{[item.city, item.country].filter(Boolean).join(", ") || "—"}</TableCell>
                <TableCell>
                  {item.tier === "partnered" ? (
                    <Badge className="bg-brand-soft text-brand">
                      Partnered
                    </Badge>
                  ) : item.tier === "verified" ? (
                    <Badge className="bg-success-soft text-success">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">Normal</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <AppIconAction
                      label={`View profile for ${item.businessName || "vendor"}`}
                      icon={<span aria-hidden="true">↗</span>}
                      onClick={() => void navigate({ to: "/app/accounts/vendors/$vendorId" as never, params: { vendorId: item.id } as never })}
                    />
                    <AppIconAction
                      label={`Change status for ${item.businessName || "vendor"}`}
                      icon={<span aria-hidden="true">↻</span>}
                      onClick={() =>
                        setStatusVendor({
                          id: item.id,
                          name: item.businessName || "vendor",
                        })
                      }
                    />
                    <AppIconAction
                      label={`Change directory tier for ${item.businessName || "vendor"}`}
                      icon={<span aria-hidden="true">◇</span>}
                      onClick={() => setVendor(item)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
      </Tabs>
      <VendorTierDialog
        key={vendor?.id ?? "no-vendor"}
        vendor={vendor}
        onClose={() => setVendor(null)}
      />
      <ProfileStatusDialog
        key={statusVendor?.id ?? "no-vendor-status"}
        kind="vendor"
        profile={statusVendor}
        onClose={() => setStatusVendor(null)}
      />
      <CreateVendorSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setCreatedVendorId}
        organizations={organizationsQuery.data?.organizations ?? []}
        organizationsLoading={organizationsQuery.isLoading}
        organizationsError={organizationsQuery.isError ? organizationsQuery.error.message : undefined}
      />
    </section>
  );
}

function displayVendorServicePrice(minor?: number | string | null, currency?: string | null) {
  if (minor == null || !currency?.trim()) return "Price unavailable";
  try {
    return formatMoney(String(minor), currency.trim());
  } catch {
    return `${currency.trim().toUpperCase()} ${minor}`;
  }
}

export function VendorDetailsPage({ vendorId }: { vendorId: string }) {
  const [activeSection, setActiveSection] = useState<"profile" | "services" | "callouts" | "bookings">("profile");
  const { session } = useAuth();
  const navigate = useNavigate();
  const vendorQuery = useQuery({
    queryKey: [...vendorKey, "detail", vendorId],
    queryFn: () => getAdminVendor(session!.token, vendorId),
    enabled: Boolean(session?.token && vendorId),
  });
  const servicesQuery = useQuery({
    queryKey: [...vendorKey, "services", vendorId],
    queryFn: () => listVendorCatalogServices(session!.token, vendorId),
    enabled: Boolean(session?.token && vendorId && activeSection === "services"),
  });
  const vendor = vendorQuery.data;
  const services = servicesQuery.data?.services ?? [];
  const sections = ["profile", "services", "callouts", "bookings"] as const;
  const sectionLabels = {
    profile: "Profile",
    services: "Services",
    callouts: "Vendor Callouts",
    bookings: "Bookings",
  } as const;

  return <section className="space-y-6">
    <div>
      <Button variant="ghost" className="mb-2 px-0" onClick={() => void navigate({ to: "/app/accounts/vendors" as never })}>← Vendors</Button>
      <h1 className="text-xl font-semibold tracking-tight">{vendor?.businessName || "Vendor profile"}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">Vendor profile details and listed services.</p>
    </div>
    {vendorQuery.isLoading ? <Card><CardContent className="py-10 text-center text-sm text-ink-muted">Loading vendor profile…</CardContent></Card>
      : vendorQuery.isError ? <ErrorMessage>{vendorQuery.error.message}</ErrorMessage>
        : !vendor ? <Card><CardContent className="py-10 text-center text-sm text-ink-muted">Vendor profile unavailable.</CardContent></Card>
          : <div className="space-y-5">
            <Card>
              <CardContent className="flex flex-wrap items-center gap-4 sm:gap-5">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-lg font-semibold text-brand">{(vendor.businessName || "V").trim().slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold tracking-tight">{vendor.businessName || "Unnamed vendor"}</h2><p className="mt-1 break-all font-mono text-xs text-ink-muted">{vendor.id}</p></div>
                <div className="flex flex-wrap items-center gap-2">{vendor.status === "active" ? <Badge className="bg-success-soft text-success">Active</Badge> : <Badge variant="outline">{vendor.status || "Unknown"}</Badge>}{vendor.tier === "partnered" ? <Badge className="bg-brand-soft text-brand">Partnered</Badge> : vendor.tier === "verified" ? <Badge className="bg-success-soft text-success">Verified</Badge> : <Badge variant="outline">Normal</Badge>}</div>
              </CardContent>
            </Card>
            <div role="tablist" aria-label="Vendor sections" className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface-muted p-1" onKeyDown={(event) => {
              const currentIndex = sections.indexOf(activeSection);
              const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : event.key === "ArrowRight" ? (currentIndex + 1) % sections.length : event.key === "ArrowLeft" ? (currentIndex - 1 + sections.length) % sections.length : -1;
              if (nextIndex >= 0) {
                event.preventDefault();
                const nextSection = sections[nextIndex];
                setActiveSection(nextSection);
                document.getElementById(`vendor-tab-${nextSection}`)?.focus();
              }
            }}>
              {sections.map((section) => <button key={section} id={`vendor-tab-${section}`} type="button" role="tab" tabIndex={activeSection === section ? 0 : -1} aria-selected={activeSection === section} aria-controls="vendor-section-panel" onClick={() => setActiveSection(section)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand ${activeSection === section ? "bg-surface text-brand shadow-sm" : "text-ink-muted hover:bg-surface hover:text-ink"}`}>{sectionLabels[section]}</button>)}
            </div>
            <div id="vendor-section-panel" role="tabpanel" aria-labelledby={`vendor-tab-${activeSection}`} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-brand/30">
            {activeSection === "profile" && <Card>
              <CardHeader><CardTitle>Profile details</CardTitle></CardHeader>
              <CardContent><dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs text-ink-muted">Business name</dt><dd className="mt-1 break-words font-medium">{vendor.businessName || "Not provided"}</dd></div>
                <div><dt className="text-xs text-ink-muted">Contact name</dt><dd className="mt-1 break-words">{vendor.contactName || "Not provided"}</dd></div>
                <div><dt className="text-xs text-ink-muted">Email</dt><dd className="mt-1 break-all">{vendor.email || "Not provided"}</dd></div>
                <div><dt className="text-xs text-ink-muted">Phone</dt><dd className="mt-1 break-words">{vendor.phone || "Not provided"}</dd></div>
                <div><dt className="text-xs text-ink-muted">Category</dt><dd className="mt-1">{vendor.category || "Not provided"}</dd></div>
                <div><dt className="text-xs text-ink-muted">Location</dt><dd className="mt-1">{[vendor.city, vendor.country].filter(Boolean).join(", ") || "Not provided"}</dd></div>
                <div><dt className="text-xs text-ink-muted">Status</dt><dd className="mt-1">{vendor.status || "Unknown"}</dd></div>
                <div><dt className="text-xs text-ink-muted">Directory tier</dt><dd className="mt-1">{vendor.tier || "Normal"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-ink-muted">Description</dt><dd className="mt-1 whitespace-pre-wrap">{vendor.description || "Not provided"}</dd></div>
              </dl></CardContent>
            </Card>}
            {activeSection === "services" && <Card>
              <CardHeader><CardTitle>Services</CardTitle></CardHeader>
              <CardContent>
                {servicesQuery.isLoading ? <p className="py-6 text-center text-sm text-ink-muted">Loading vendor services…</p>
                  : servicesQuery.isError ? <ErrorMessage>{servicesQuery.error.message}</ErrorMessage>
                    : services.length === 0 ? <p className="py-6 text-center text-sm text-ink-muted">No services are listed for this vendor.</p>
                      : <ul className="divide-y divide-line">{services.map((service) => <li key={service.kind} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="font-medium">{service.name || "Unnamed service"}</p><p className="mt-1 text-xs text-ink-muted">{service.kind || "Service type unavailable"}</p></div><p className="shrink-0 text-right font-medium tabular-nums">{displayVendorServicePrice(service.priceMinor, service.currency)}</p></li>)}</ul>}
              </CardContent>
            </Card>}
            {activeSection === "callouts" && <Card><CardHeader><CardTitle>Vendor callouts</CardTitle></CardHeader><CardContent><p className="text-sm text-ink-muted">Vendor-specific callout responses are not available through the admin API yet.</p></CardContent></Card>}
            {activeSection === "bookings" && <Card><CardHeader><CardTitle>Bookings</CardTitle></CardHeader><CardContent><p className="text-sm text-ink-muted">Vendor bookings are not available through the admin API yet.</p></CardContent></Card>}
            </div>
          </div>}
  </section>;
}

function VenueCreationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const countriesQuery = useQuery({
    queryKey: ["qk-admin-platform-countries"],
    queryFn: () => listCountries(session!.token),
    enabled: Boolean(session?.token && open),
  });
  const countries = (countriesQuery.data?.countries ?? []).filter((item) => item.enabled);
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    VenueDirectoryEntry[]
  >([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [category, setCategory] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const reset = () => {
    setDuplicateCandidates([]);
    setError("");
    setPending(false);
    setName("");
    setCity("");
    setCountry("");
    setAddress("");
    setWebsiteUrl("");
    setSocialLinks({});
    setCategory("");
    setCapacity("");
    setDescription("");
  };
  async function submit(confirmNotDuplicate = false) {
    setError("");
    setPending(true);
    try {
      const result = await createDirectoryVenue(session!.token, {
        name: name.trim(),
        capacity: Number(capacity),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(country.trim() ? { country: country.trim() } : {}),
        ...(websiteUrl.trim() ? { websiteUrl: websiteUrl.trim() } : {}),
        ...(Object.values(socialLinks).some((url) => url.trim()) ? { socialLinks: Object.fromEntries(Object.entries(socialLinks).filter(([, url]) => url.trim()).map(([network, url]) => [network, url.trim()])) } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(confirmNotDuplicate ? { confirmNotDuplicate: true } : {}),
      });
      if (!result || typeof result !== "object")
        throw new Error("The venue service returned no creation result.");
      if (result.created) {
        await queryClient.invalidateQueries({ queryKey: venueKey });
        reset();
        onOpenChange(false);
      } else {
        setDuplicateCandidates(
          Array.isArray(result.duplicateCandidates)
            ? result.duplicateCandidates.filter(
                (candidate): candidate is VenueDirectoryEntry =>
                  Boolean(candidate?.id),
              )
            : [],
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create this venue.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add directory venue</SheetTitle>
          <SheetDescription>
            Create an unclaimed venue listing. Capacity is required; blank
            optional fields are omitted.
          </SheetDescription>
        </SheetHeader>
        <form
          id="create-directory-venue"
          className="flex-1 space-y-3 overflow-y-auto px-6 pb-6"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block space-y-1.5 text-sm font-medium">
            Venue name
            <Input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Capacity
            <Input
              required
              type="number"
              min="1"
              step="1"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Address{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            City <span className="font-normal text-ink-muted">(optional)</span>
            <Input
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Country{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              disabled={countriesQuery.isLoading || countriesQuery.isError || countries.length === 0}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"
            >
              <option value="">{countriesQuery.isLoading ? "Loading countries…" : countries.length ? "Choose a country" : "No configured countries"}</option>
              {countries.map((item) => <option key={item.code} value={item.code}>{item.name} ({item.code})</option>)}
            </select>
            {countriesQuery.isError && <p role="alert" className="text-xs text-danger">Could not load configured countries: {countriesQuery.error.message}</p>}
            {countriesQuery.isSuccess && countries.length === 0 && <p className="text-xs text-ink-muted">No enabled countries are configured.</p>}
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Category{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Website URL <span className="font-normal text-ink-muted">(optional)</span>
            <Input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" />
          </label>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Social profile links <span className="font-normal text-ink-muted">(optional)</span></legend>
            {([['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['x', 'X'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn']] as const).map(([key, label]) => <label key={key} className="block space-y-1.5 text-sm font-medium">
              {label}
              <Input type="url" value={socialLinks[key] ?? ''} onChange={(event) => setSocialLinks((current) => ({ ...current, [key]: event.target.value }))} placeholder="https://" />
            </label>)}
          </fieldset>
          <label className="block space-y-1.5 text-sm font-medium">
            Description{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
            />
          </label>
        </form>
        {error && (
          <div className="px-6">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
        {duplicateCandidates.length > 0 && (
          <div className="mx-6 space-y-2 rounded-lg border border-warning/30 bg-warning-soft p-3">
            <p className="text-sm font-medium">Possible duplicate venues</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {duplicateCandidates.map((candidate) => (
                <li key={candidate.id}>
                  {candidate.name || "Unnamed venue"}
                  {candidate.city ? ` · ${candidate.city}` : ""}
                  {candidate.country ? `, ${candidate.country}` : ""}
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-muted">
              Confirm only if this is a separate venue.
            </p>
          </div>
        )}
        <SheetFooter className="border-t border-line">
          {duplicateCandidates.length ? (
            <Button disabled={pending} onClick={() => void submit(true)}>
              {pending ? "Creating…" : "Create anyway"}
            </Button>
          ) : (
            <Button
              type="submit"
              form="create-directory-venue"
              disabled={
                pending || !name.trim() || !capacity || Number(capacity) < 1
              }
            >
              {pending ? "Checking…" : "Check and create"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function VenueLinksDialog({ venue, onClose }: { venue: VenueDirectoryEntry | null; onClose: () => void }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [websiteUrl, setWebsiteUrl] = useState(venue?.websiteUrl || "");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(() => ({ ...(venue?.socialLinks ?? {}) }));
  const mutation = useMutation({
    mutationFn: () => {
      if (!venue) throw new Error("Choose a venue to update.");
      const links = Object.fromEntries(Object.entries(socialLinks).filter(([, url]) => url.trim()).map(([key, url]) => [key, url.trim()]));
      return patchDirectoryVenue(session!.token, venue.id, {
        websiteUrl: websiteUrl.trim(),
        ...(Object.keys(links).length ? { socialLinks: links } : {}),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: venueKey });
      onClose();
    },
  });
  const networks = [...new Set(["facebook", "instagram", "tiktok", "x", "youtube", "linkedin", ...Object.keys(socialLinks)])];

  return <Dialog open={Boolean(venue)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[min(85vh,760px)] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Edit venue links</DialogTitle><DialogDescription>Update the website and social profiles for {venue?.name || "this venue"}. Leave Website URL blank to clear it.</DialogDescription></DialogHeader>
      <form id="edit-venue-links" className="space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <label className="block space-y-1.5 text-sm font-medium">Website URL<Input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" /></label>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">Social profile links</legend>
          <p className="mb-3 text-xs text-ink-muted">Saving one or more links replaces the current social links map. Leaving all blank keeps it unchanged.</p>
          {networks.map((key) => <label key={key} className="block space-y-1.5 text-sm font-medium">{key === "x" ? "X" : key[0].toUpperCase() + key.slice(1)}<Input type="url" value={socialLinks[key] ?? ""} onChange={(event) => setSocialLinks((current) => ({ ...current, [key]: event.target.value }))} placeholder="https://" /></label>)}
        </fieldset>
        {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
      </form>
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="edit-venue-links" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save links"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function VenueOwnershipDialog({
  venue,
  onClose,
}: {
  venue: VenueDirectoryEntry | null;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: [...venueKey, "ownership", venue?.id],
    queryFn: () => getVenueOwnershipHistory(session!.token, venue!.id),
    enabled: Boolean(session?.token && venue),
  });
  const events = Array.isArray(query.data?.events)
    ? query.data.events.filter((event): event is NonNullable<typeof event> =>
        Boolean(event?.id),
      )
    : [];
  return (
    <Dialog
      open={Boolean(venue)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Venue ownership history</DialogTitle>
          <DialogDescription>
            {venue?.name || "Venue"} · {venue?.city || "Location unavailable"}
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <p className="py-5 text-sm text-ink-muted">
            Loading ownership history…
          </p>
        ) : query.isError ? (
          <ErrorMessage>{query.error.message}</ErrorMessage>
        ) : events.length ? (
          <ol className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="border-l-2 border-line pl-3">
                <p className="text-sm font-medium">
                  {(event.reason || "ownership event").replaceAll("_", " ")}
                </p>
                <p className="mt-1 break-all text-xs text-ink-muted">
                  {event.fromAccountId || "Unowned"} →{" "}
                  {event.toAccountId || "Unknown owner"}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-5 text-sm text-ink-muted">
            No ownership events recorded.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AccountsVenuesPage({ initialTab = "directory" }: { initialTab?: "directory" | "claims" | "organizations" } = {}) {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: venueKey,
    queryFn: () => listVenueDirectory(session!.token),
    enabled: Boolean(session?.token),
  });
  const reconciliation = useQuery({
    queryKey: venueOrgQueueKey,
    queryFn: () => listVenueOrganizationReconciliation(session!.token),
    enabled: Boolean(session?.token),
  });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [historyVenue, setHistoryVenue] = useState<VenueDirectoryEntry | null>(
    null,
  );
  const [linksVenue, setLinksVenue] = useState<VenueDirectoryEntry | null>(null);
  const [statusVenue, setStatusVenue] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const venues = query.data?.venues ?? [];
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Venues</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Browse active venue listings, create directory entries, and inspect
            ownership history.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add directory venue</Button>
      </div>
      <Tabs defaultValue={initialTab} className="gap-5">
        <TabsList variant="line" aria-label="Venue management sections">
          <TabsTrigger value="directory">Venue directory</TabsTrigger>
          <TabsTrigger value="claims">Venue claims</TabsTrigger>
          <TabsTrigger value="organizations">
            Managing organization review
          </TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="flex flex-col gap-5">
          <div
            role="note"
            className="rounded-card border border-brand/15 bg-brand-soft/50 px-4 py-1 text-sm leading-6 text-ink-muted"
          >
            The public directory includes active claimed and unclaimed venues.
            Pending and suspended venues are not included in the listing
            endpoint.
          </div>
          <DirectoryTable
            title="Active venue directory"
            rows={venues}
            isLoading={query.isLoading}
            error={query.isError ? query.error.message : null}
            search={search}
            onSearch={setSearch}
            emptyTitle="No active venue listings"
            emptyMessage="Add a directory venue or wait for an active venue to appear."
            columns={["Venue", "City", "Country", "Category", "Capacity", "Status", "Claim status", "Web & social", "Actions"]}
            label="venues"
            renderRow={(venue) => (
              <TableRow key={venue.id}>
                <TableCell>
                  <Identity
                    name={venue.name || "Unnamed venue"}
                    secondary={
                      venue.address || "Directory listing"
                    }
                  />
                </TableCell>
                <TableCell>{venue.city || "—"}</TableCell>
                <TableCell>{venue.country || "—"}</TableCell>
                <TableCell>{venue.category || "—"}</TableCell>
                <TableCell className="text-right">
                  {typeof venue.capacity === "number"
                    ? venue.capacity.toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>
                  {venue.status === "active" ? <Badge className="bg-success-soft text-success">Active</Badge> : venue.status === "suspended" ? <Badge className="bg-danger-soft text-danger">Suspended</Badge> : <Badge variant="outline">{venue.status || "Unknown"}</Badge>}
                </TableCell>
                <TableCell>
                  {venue.claimed === true ? (
                    <Badge className="bg-success-soft text-success">
                      Claimed
                    </Badge>
                  ) : venue.claimed === false ? (
                    <Badge variant="outline">Unclaimed</Badge>
                  ) : (
                    <Badge variant="outline">Unknown</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {safeHttpUrl(venue.websiteUrl) && <a href={safeHttpUrl(venue.websiteUrl)!} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">Website</a>}
                    {Object.entries(venue.socialLinks ?? {}).map(([network, url]) => safeHttpUrl(url) && <a key={network} href={safeHttpUrl(url)!} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">{network === "x" ? "X" : network}</a>)}
                    {!safeHttpUrl(venue.websiteUrl) && !Object.values(venue.socialLinks ?? {}).some((url) => safeHttpUrl(url)) && <span className="text-ink-muted">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <AppIconAction
                      label={`Edit links for ${venue.name || "venue"}`}
                      icon={<span aria-hidden="true">↗</span>}
                      onClick={() => setLinksVenue(venue)}
                    />
                    <AppIconAction
                      label={`Change status for ${venue.name || "venue"}`}
                      icon={<span aria-hidden="true">↻</span>}
                      onClick={() =>
                        setStatusVenue({
                          id: venue.id,
                          name: venue.name || "venue",
                        })
                      }
                    />
                    <AppIconAction
                      label={`View ownership history for ${venue.name || "venue"}`}
                      icon={<span aria-hidden="true">◷</span>}
                      onClick={() => setHistoryVenue(venue)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
        <TabsContent value="claims">
          <VenueClaimsQueue />
        </TabsContent>
        <TabsContent value="organizations">
          <OrganizationReconciliationQueue
            title="Managing organization review"
            description="Assign the verified organization that manages each unlinked venue profile."
            items={(reconciliation.data?.items ?? []).map((item) => ({
              id: item.venueId,
              name: item.name || "Unnamed venue",
              ownerAccountId: item.ownerAccountId,
            }))}
            loading={reconciliation.isLoading}
            error={reconciliation.isError ? reconciliation.error.message : null}
            queueKey={venueOrgQueueKey}
            resolve={(id, orgId, reason) =>
              resolveVenueOrganization(session!.token, id, orgId, reason)
            }
          />
        </TabsContent>
      </Tabs>
      <VenueCreationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <VenueLinksDialog key={linksVenue?.id ?? "no-venue-links"} venue={linksVenue} onClose={() => setLinksVenue(null)} />
      <ProfileStatusDialog
        key={statusVenue?.id ?? "no-venue-status"}
        kind="venue"
        profile={statusVenue}
        onClose={() => setStatusVenue(null)}
      />
      <VenueOwnershipDialog
        venue={historyVenue}
        onClose={() => setHistoryVenue(null)}
      />
    </section>
  );
}

export function MarketplaceReconciliationPage() {
  const { session } = useAuth();
  const venues = useQuery({
    queryKey: venueOrgQueueKey,
    queryFn: () => listVenueOrganizationReconciliation(session!.token),
    enabled: Boolean(session?.token),
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Organization reconciliation</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Link venue profiles to the organization that manages them.
        </p>
      </div>
      <Tabs defaultValue="venues" className="gap-5">
        <TabsContent value="venues">
          <OrganizationReconciliationQueue
            title="Venue organization review"
            description="Assign the verified organization that manages each unlinked venue profile."
            items={(venues.data?.items ?? []).map((item) => ({
              id: item.venueId,
              name: item.name || "Unnamed venue",
              ownerAccountId: item.ownerAccountId,
            }))}
            loading={venues.isLoading}
            error={venues.isError ? venues.error.message : null}
            queueKey={venueOrgQueueKey}
            resolve={(id, orgId, reason) =>
              resolveVenueOrganization(session!.token, id, orgId, reason)
            }
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

export function AccountsOrganizationsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const organizationsQuery = useQuery({
    queryKey: organizationsKey,
    queryFn: () => listAdminOrganizations(session!.token),
    enabled: Boolean(session?.token),
  });
  const ownersQuery = useQuery({
    queryKey: accountPickerKey,
    queryFn: () => listAdminConsumers(session!.token),
    enabled: Boolean(session?.token),
  });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [orgPageIndex, setOrgPageIndex] = useState(0);
  const [orgPageSize, setOrgPageSize] = useState(10);
  const organizations = organizationsQuery.data?.organizations ?? [];
  const owners = new Map(
    (ownersQuery.data?.users ?? []).map((owner) => [owner.id, owner]),
  );
  const filteredOrganizations = organizations.filter((organization) => {
    const owner = owners.get(organization.ownerId || "");
    return `${organization.name ?? ""} ${organization.slug ?? ""} ${organization.id} ${organization.type ?? ""} ${organization.ownerId ?? ""} ${owner?.name ?? ""} ${owner?.email ?? ""} ${owner?.phone ?? ""} ${organization.email ?? ""} ${organization.phone ?? ""} ${organization.address ?? ""} ${organization.status ?? ""} ${organization.kycStatus ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  });
  const visibleOrganizations = filteredOrganizations.slice(
    orgPageIndex * orgPageSize,
    (orgPageIndex + 1) * orgPageSize,
  );
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Organizations
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Browse organizations and review their owners and status.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add organization</Button>
      </div>
      <div className="flex justify-end"><Input
        aria-label="Search organizations"
        placeholder="Search organization, owner, contact, or status"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setOrgPageIndex(0);
        }}
        className="sm:w-72"
      /></div>
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <DataTable
            data={visibleOrganizations}
            headers={[
              "Organization",
              "Type",
              "Owner",
              "Contact",
              "Address",
              "Status",
              "KYC",
              "Created",
              { label: "Actions", className: "text-right" },
            ]}
            label="Organization directory"
            loading={organizationsQuery.isLoading}
            loadingMessage="Loading organizations…"
            error={
              organizationsQuery.isError
                ? organizationsQuery.error.message
                : null
            }
            emptyMessage={
              organizations.length
                ? "No organizations match this search."
                : "No organizations found."
            }
            emptyClassName="h-28 text-center text-sm text-ink-muted"
            containerClassName=""
            pagination={{
              pageIndex: orgPageIndex,
              pageSize: orgPageSize,
              totalItems: filteredOrganizations.length,
              onPageChange: setOrgPageIndex,
              onPageSizeChange: (size) => {
                setOrgPageSize(size);
                setOrgPageIndex(0);
              },
            }}
            renderRow={(organization) => {
              const owner = owners.get(organization.ownerId || "");
              return (
                <TableRow key={organization.id}>
                  <TableCell>
                    <Identity
                      name={
                        organization.name ||
                        organization.slug ||
                        "Unnamed organization"
                      }
                      secondary={organization.slug || organization.id}
                    />
                  </TableCell>
                  <TableCell>
                    <OrganizationTypeBadge type={organization.type} />
                  </TableCell>
                  <TableCell>
                    <Identity
                      name={owner?.name || owner?.email || "Owner account"}
                      secondary={
                        owner?.email ||
                        owner?.phone ||
                        organization.ownerId ||
                        "Not provided"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span className="block">{organization.email || "—"}</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {organization.phone || "No phone"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal">
                    {organization.address || "—"}
                  </TableCell>
                  <TableCell>
                    {organization.status === "active" ? (
                      <Badge className="bg-success-soft text-success">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {organization.status || "Unknown"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {organization.kycStatus === "approved" ? (
                      <Badge className="bg-success-soft text-success">
                        Approved
                      </Badge>
                    ) : organization.kycStatus === "pending" ? (
                      <Badge className="bg-warning-soft text-warning">
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {organization.kycStatus || "Unknown"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {typeof organization.createdAt === "string"
                      ? formatDate(organization.createdAt.slice(0, 10))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <AppIconAction
                        label={`View details for ${organization.name || "organization"}`}
                        icon={<span aria-hidden="true">↗</span>}
                        onClick={() => {
                          void navigate({
                            to: "/app/$module/$section" as never,
                            params: {
                              module: "organizations",
                              section: organization.id,
                            } as never,
                          });
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            }}
          />
        </CardContent>
      </Card>
      <CreateOrganizationSheet open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}

export function OrganizationDetailsPage({
  organizationId,
}: {
  organizationId: string;
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const { session } = useAuth();
  const navigate = useNavigate();
  const organizationsQuery = useQuery({
    queryKey: organizationsKey,
    queryFn: () => listAdminOrganizations(session!.token),
    enabled: Boolean(session?.token),
  });
  const ownersQuery = useQuery({
    queryKey: accountPickerKey,
    queryFn: () => listAdminConsumers(session!.token),
    enabled: Boolean(session?.token),
  });
  const commerceQuery = useQuery({
    queryKey: ["qk-admin-org-commerce-profile", organizationId],
    queryFn: () =>
      getOrganizationCommerceProfile(session!.token, organizationId),
    enabled: Boolean(session?.token && organizationId),
  });
  const organization = (organizationsQuery.data?.organizations ?? []).find(
    (item) => item.id === organizationId,
  );
  const membersQuery = useQuery({
    queryKey: ["qk-admin-organization-members", organizationId],
    queryFn: () => listOrganizationMembers(session!.token, organizationId),
    enabled: Boolean(session?.token && organizationId && activeSection === "members"),
  });
  const kycProfilesQuery = useQuery({
    queryKey: ["qk-admin-kyc-profiles"],
    queryFn: () => listAdminKycProfiles(session!.token),
    enabled: Boolean(session?.token && organization && activeSection === "documents"),
  });
  const kycProfile = (kycProfilesQuery.data?.profiles ?? []).find(
    (profile) => profile.type === "organization" && profile.accountId === organizationId,
  ) ?? (kycProfilesQuery.data?.profiles ?? []).find(
    (profile) => profile.type === "organization" && Boolean(organization?.ownerId) && profile.accountId === organization?.ownerId,
  );
  const kycDocumentsQuery = useQuery({
    queryKey: ["qk-admin-kyc-profile", kycProfile?.id],
    queryFn: () => getAdminKycProfile(session!.token, kycProfile!.id),
    enabled: Boolean(session?.token && kycProfile?.id && activeSection === "documents"),
  });
  const owner = (ownersQuery.data?.users ?? []).find(
    (item) => item.id === organization?.ownerId,
  );
  const registrations = (commerceQuery.data?.registrations ?? []).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );
  const exemptions = (commerceQuery.data?.exemptions ?? []).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Accounts / Organizations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {organization?.name || "Organization details"}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Organization profile and ownership information.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void navigate({
              to: "/app/$module/$section" as never,
              params: { module: "accounts", section: "organizations" } as never,
            });
          }}
        >
          Back to organizations
        </Button>
      </div>
      {organizationsQuery.isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            Loading organization details…
          </CardContent>
        </Card>
      ) : organizationsQuery.isError ? (
        <ErrorMessage>{organizationsQuery.error.message}</ErrorMessage>
      ) : !organization ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            Organization not found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 sm:gap-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-lg font-semibold text-brand">
                {(organization.name || "O").trim().slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold tracking-tight">{organization.name || "Unnamed organization"}</h2>
                <p className="mt-1 break-all font-mono text-xs text-ink-muted">{organization.id}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <OrganizationTypeBadge type={organization.type} />
                {organization.status === "active" ? <Badge className="bg-success-soft text-success">Active</Badge> : <Badge variant="outline">{organization.status || "Unknown"}</Badge>}
                {organization.kycStatus === "approved" ? <Badge className="bg-success-soft text-success">KYC approved</Badge> : organization.kycStatus === "pending" ? <Badge className="bg-warning-soft text-warning">KYC pending</Badge> : <Badge variant="outline">KYC {organization.kycStatus || "unknown"}</Badge>}
              </div>
            </CardContent>
          </Card>
          <div role="tablist" aria-label="Organization sections" className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface-muted p-1" onKeyDown={(event) => {
            const values = ["overview", "ownership", "members", "documents", "commerce", "features"];
            const currentIndex = values.indexOf(activeSection);
            const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? values.length - 1 : event.key === "ArrowRight" ? (currentIndex + 1) % values.length : event.key === "ArrowLeft" ? (currentIndex - 1 + values.length) % values.length : -1;
            if (nextIndex >= 0) {
              event.preventDefault();
              const nextSection = values[nextIndex];
              setActiveSection(nextSection);
              document.getElementById(`organization-tab-${nextSection}`)?.focus();
            }
          }}>
            {([
              ["overview", "Overview"],
              ["ownership", "Owner & contact"],
              ["members", "Organization members"],
              ["documents", "KYC documents"],
              ["commerce", "Commerce & tax"],
              ["features", "Feature flags"],
            ] as const).map(([value, label]) => <button key={value} id={`organization-tab-${value}`} type="button" role="tab" tabIndex={activeSection === value ? 0 : -1} aria-selected={activeSection === value} aria-controls="organization-section-panel" onClick={() => setActiveSection(value)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand ${activeSection === value ? "bg-surface text-brand shadow-sm" : "text-ink-muted hover:bg-surface hover:text-ink"}`}>{label}</button>)}
          </div>
          <div id="organization-section-panel" role="tabpanel" aria-labelledby={`organization-tab-${activeSection}`} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-brand/30">
          {activeSection === "overview" && <Card>
            <CardHeader>
              <CardTitle>Organization profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-5 gap-y-4 text-sm">
                <dt className="text-ink-muted">Name</dt>
                <dd className="font-medium">{organization.name || "—"}</dd>
                <dt className="text-ink-muted">Organization ID</dt>
                <dd className="break-all font-mono text-xs">
                  {organization.id}
                </dd>
                <dt className="text-ink-muted">Slug</dt>
                <dd>{organization.slug || "—"}</dd>
                <dt className="text-ink-muted">Type</dt>
                <dd>
                  <OrganizationTypeBadge type={organization.type} />
                </dd>
                <dt className="text-ink-muted">Status</dt>
                <dd>
                  {organization.status === "active" ? (
                    <Badge className="bg-success-soft text-success">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {organization.status || "Unknown"}
                    </Badge>
                  )}
                </dd>
                <dt className="text-ink-muted">KYC status</dt>
                <dd>
                  {organization.kycStatus === "approved" ? (
                    <Badge className="bg-success-soft text-success">
                      Approved
                    </Badge>
                  ) : organization.kycStatus === "pending" ? (
                    <Badge className="bg-warning-soft text-warning">
                      Pending
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {organization.kycStatus || "Unknown"}
                    </Badge>
                  )}
                </dd>
                <dt className="text-ink-muted">Created</dt>
                <dd>
                  {typeof organization.createdAt === "string"
                    ? formatDate(organization.createdAt.slice(0, 10))
                    : "—"}
                </dd>
              </dl>
            </CardContent>
          </Card>}
          {activeSection === "ownership" && <Card>
            <CardHeader>
              <CardTitle>Owner and contact</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-5 gap-y-4 text-sm">
                <dt className="text-ink-muted">Owner</dt>
                <dd>{owner?.name || owner?.email || "Owner account"}</dd>
                <dt className="text-ink-muted">Owner account ID</dt>
                <dd className="break-all font-mono text-xs">
                  {organization.ownerId || "—"}
                </dd>
                <dt className="text-ink-muted">Owner email</dt>
                <dd className="break-all">{owner?.email || "—"}</dd>
                <dt className="text-ink-muted">Owner phone</dt>
                <dd>{owner?.phone || "—"}</dd>
                <dt className="text-ink-muted">Organization email</dt>
                <dd className="break-all">{organization.email || "—"}</dd>
                <dt className="text-ink-muted">Organization phone</dt>
                <dd>{organization.phone || "—"}</dd>
                <dt className="text-ink-muted">Address</dt>
                <dd className="whitespace-pre-wrap">
                  {organization.address || "—"}
                </dd>
              </dl>
              {ownersQuery.isError && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  Owner account details could not be loaded:{" "}
                  {ownersQuery.error.message}
                </p>
              )}
            </CardContent>
          </Card>}
          {activeSection === "members" && <Card>
            <CardHeader><CardTitle>Organization members</CardTitle></CardHeader>
            <CardContent>
              {membersQuery.isLoading ? <p className="py-6 text-center text-sm text-ink-muted">Loading organization members…</p>
                : membersQuery.isError ? <ErrorMessage>{membersQuery.error.message}</ErrorMessage>
                  : (membersQuery.data?.members ?? []).length ? <ul className="divide-y divide-line">
                    {(membersQuery.data?.members ?? []).map((member, index) => <li key={member.id || member.userId || member.accountId || index} className="flex flex-wrap items-center gap-x-8 gap-y-2 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.name || member.email || member.userId || member.accountId || "Unnamed member"}</p><p className="mt-1 break-all text-xs text-ink-muted">{member.email || member.phone || "No contact details"}</p></div>
                      <Badge variant="outline">{member.roleName || member.role || member.roleId || "Member"}</Badge>
                      <OrganizationMemberStatus status={member.status} />
                    </li>)}
                  </ul> : <p className="py-6 text-center text-sm text-ink-muted">No members found for this organization.</p>}
            </CardContent>
          </Card>}
          {activeSection === "documents" && <Card>
            <CardHeader><CardTitle>Submitted KYC documents</CardTitle><p className="text-sm text-ink-muted">Documents submitted for this organization’s verification case.</p></CardHeader>
            <CardContent>
              {kycProfilesQuery.isLoading ? <p className="py-6 text-center text-sm text-ink-muted">Finding the organization’s KYC case…</p>
                : kycProfilesQuery.isError ? <ErrorMessage>{kycProfilesQuery.error.message}</ErrorMessage>
                  : !kycProfile ? <p className="py-6 text-center text-sm text-ink-muted">No organization KYC case was found.</p>
                    : kycDocumentsQuery.isLoading ? <p className="py-6 text-center text-sm text-ink-muted">Loading submitted documents…</p>
                      : kycDocumentsQuery.isError ? <ErrorMessage>{kycDocumentsQuery.error.message}</ErrorMessage>
                        : (kycDocumentsQuery.data?.documents ?? []).length ? <ul className="divide-y divide-line">
                          {(kycDocumentsQuery.data?.documents ?? []).map((document, index) => {
                            let documentUrl: string | null = null;
                            try {
                              const parsed = new URL(document.refUrl || "");
                              if (parsed.protocol === "https:" || parsed.protocol === "http:") documentUrl = parsed.href;
                            } catch { /* Non-URL document references are shown as labels only. */ }
                            return <li key={document.id || `${document.kind || "document"}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                              <div className="min-w-0"><p className="text-sm font-medium">{document.kind || "KYC document"}</p><p className="mt-1 break-all text-xs text-ink-muted">{document.id || "Document reference unavailable"}</p></div>
                              {documentUrl ? <a href={documentUrl} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-brand underline underline-offset-2">View document</a> : <span className="text-xs text-ink-muted">Document link unavailable</span>}
                            </li>;
                          })}
                        </ul> : <p className="py-6 text-center text-sm text-ink-muted">No documents have been submitted for this organization.</p>}
            </CardContent>
          </Card>}
          {activeSection === "commerce" && <Card>
            <CardHeader>
              <CardTitle>Commerce and tax profile</CardTitle>
            </CardHeader>
            <CardContent>
              {commerceQuery.isLoading ? (
                <p className="text-sm text-ink-muted">
                  Loading commerce profile…
                </p>
              ) : commerceQuery.isError ? (
                <p role="alert" className="text-sm text-danger">
                  {commerceQuery.error.message}
                </p>
              ) : commerceQuery.data ? (
                <div className="space-y-5">
                  <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-5 gap-y-3 text-sm">
                    <dt className="text-ink-muted">Fee payer override</dt>
                    <dd>
                      {commerceQuery.data.feePayerOverride ||
                        "Platform default"}
                    </dd>
                    <dt className="text-ink-muted">Effective fee payer</dt>
                    <dd>{commerceQuery.data.effectiveFeePayer || "Unknown"}</dd>
                  </dl>
                  <div>
                    <h3 className="text-sm font-medium">Tax registrations</h3>
                    {registrations.length ? (
                      <ul className="mt-2 divide-y divide-line">
                        {registrations.map((item, index) => (
                          <li
                            key={`${item.country}-${item.subdivision}-${item.registrationNumber}-${index}`}
                            className="py-2 text-sm first:pt-0"
                          >
                            {item.country || "Unknown country"}
                            {item.subdivision ? ` · ${item.subdivision}` : ""}
                            {item.registrationNumber
                              ? ` · ${item.registrationNumber}`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-ink-muted">
                        No tax registrations on file.
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Tax exemptions</h3>
                    {exemptions.length ? (
                      <ul className="mt-2 divide-y divide-line">
                        {exemptions.map((item, index) => (
                          <li
                            key={`${item.country}-${item.subdivision}-${index}`}
                            className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0"
                          >
                            <span>
                              {item.country || "Unknown country"}
                              {item.subdivision ? ` · ${item.subdivision}` : ""}
                            </span>
                            <Badge
                              variant={
                                item.status === "approved"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {item.status || "Unknown"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-ink-muted">
                        No tax exemptions on file.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  No commerce profile data is available.
                </p>
              )}
            </CardContent>
          </Card>}
          {activeSection === "features" && <OrganizationFeatureFlagsCard organizationId={organization.id} />}
          </div>
        </div>
      )}
    </section>
  );
}

export function AccountsOrganizationUsersPage() {
  const { session } = useAuth();
  const [lookupId, setLookupId] = useState("");
  const organizationsQuery = useQuery({
    queryKey: ["qk-admin-organizations"],
    queryFn: () => listAdminOrganizations(session!.token),
    enabled: Boolean(session?.token),
  });
  const membersQuery = useQuery({
    queryKey: ["qk-admin-organization-members", lookupId],
    queryFn: () => listOrganizationMembers(session!.token, lookupId),
    enabled: Boolean(session?.token && lookupId),
  });
  const organizations = organizationsQuery.data?.organizations ?? [];
  const members = membersQuery.data?.members ?? [];
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Organization users
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          View members belonging to an organization.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="sr-only" htmlFor="member-org-select">Organization</label>
        <select
          id="member-org-select"
          value={lookupId}
          onChange={(event) => setLookupId(event.target.value)}
          disabled={organizationsQuery.isLoading || organizationsQuery.isError || organizations.length === 0}
          className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand sm:max-w-md"
        >
          <option value="">{organizationsQuery.isLoading ? 'Loading organizations…' : 'Choose an organization'}</option>
          {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name || organization.slug || organization.id}</option>)}
        </select>
      </div>
      {organizationsQuery.isError && <ErrorMessage>{organizationsQuery.error.message}</ErrorMessage>}
      {organizationsQuery.isSuccess && organizations.length === 0 && <p className="text-sm text-ink-muted">No organizations available.</p>}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <DataTable
            data={members}
            headers={['Member', 'Contact', 'Role', 'Status']}
            label="Organization members"
            loading={Boolean(lookupId && membersQuery.isLoading)}
            loadingMessage="Loading organization members…"
            error={membersQuery.isError ? membersQuery.error.message : null}
            emptyMessage={lookupId ? 'No members found for this organization.' : 'Select an organization to load its members.'}
            renderRow={(member, index) => <TableRow key={member.id || member.userId || member.accountId || index}>
              <TableCell><Identity name={member.name || member.email || member.userId || member.accountId || member.id || 'Unnamed member'} secondary={member.status || member.id || member.userId || member.accountId || 'Organization member'} /></TableCell>
              <TableCell>{member.email || member.phone || 'No contact details'}</TableCell>
              <TableCell>{member.roleName || member.role || member.roleId || 'Member'}</TableCell>
              <TableCell><OrganizationMemberStatus status={member.status} /></TableCell>
            </TableRow>}
            containerClassName=""
          />
        </CardContent>
      </Card>
    </section>
  );
}
