import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { listAdminOrganizations } from '@/services/admin-account-directory'
import {
  createFeeRule,
  createTaxRule,
  getAdminPayout,
  getCommerceSettings,
  getOrganizationCommerceProfile,
  listAdminPayouts,
  listFeeRules,
  listTaxRules,
  reviewOrganizationTaxExemption,
  updateCommerceSettings,
  updateFeeRule,
  updateTaxRule,
  type CommerceSettings,
  type FeeRule,
  type OrgCommerceProfile,
  type Payout,
  type TaxRule,
} from '@/services/admin-commerce'
import { AppDatePicker } from '@/components/ui/date-picker'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/date-format'
import { formatMoney } from '@/lib/money-format'

const keys = {
  tax: (country: string) => ['qk-admin-tax-rules', country] as const,
  fees: (country: string) => ['qk-admin-fee-rules', country] as const,
  settings: ['qk-admin-commerce-settings'] as const,
  organizations: ['qk-admin-organizations'] as const,
  profile: (id: string) => ['qk-admin-organization-commerce-profile', id] as const,
  payout: (id: string) => ['qk-admin-payout', id] as const,
  payouts: (status: string, pageIndex: number, pageSize: number) => ['qk-admin-payouts', status, pageIndex, pageSize] as const,
}

function Heading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-semibold tracking-tight">{title}</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p></div>{action}</div>
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>
}

function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5 text-sm font-medium">{label}{children}{hint && <span className="block text-xs font-normal text-ink-muted">{hint}</span>}</label>
}

function FormFooter({ id, pending, label, disabled = false }: { id: string; pending: boolean; label: string; disabled?: boolean }) {
  return <SheetFooter className="border-t border-line"><Button type="submit" form={id} disabled={pending || disabled}>{pending ? 'Saving…' : label}</Button></SheetFooter>
}

function utcToday() {
  const now = new Date()
  return `${String(now.getUTCFullYear()).padStart(4, '0')}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function timestampToDate(value?: number | null) {
  if (!value) return ''
  const date = new Date(value * 1000)
  if (!Number.isFinite(date.getTime())) return ''
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function dateToTimestamp(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 1000)
}

function formatTimestamp(value?: number | null) {
  return formatDate(timestampToDate(value))
}

function statusBadge(status?: string | null) {
  const value = status || 'unknown'
  const styles = value === 'approved' || value === 'paid'
    ? 'bg-success-soft text-success'
    : value === 'pending' || value === 'overdue'
      ? 'bg-warning-soft text-warning'
      : value === 'rejected' || value === 'voided' || value === 'refunded'
        ? 'bg-danger-soft text-danger'
        : ''
  return <Badge className={styles || undefined}>{value.replace(/_/g, ' ')}</Badge>
}

function safeMoney(minorUnits: number, currency: string) {
  try { return formatMoney(String(minorUnits), currency) } catch { return `${currency.toUpperCase()} ${minorUnits}` }
}

function safeEvidenceUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch { return null }
}

type TaxDraft = {
  country: string
  subdivision: string
  supplyKind: NonNullable<TaxRule['supplyKind']>
  categoryId: string
  component: string
  rateBasisPoints: string
  inclusive: boolean
  requiresRegistration: boolean
  exemptionHonored: boolean
  remittedBy: NonNullable<TaxRule['remittedBy']>
  effectiveFrom: string
  effectiveTo: string
}

function taxDraft(rule?: TaxRule | null): TaxDraft {
  return {
    country: rule?.country ?? '', subdivision: rule?.subdivision ?? '',
    supplyKind: rule?.supplyKind ?? 'any', categoryId: String(rule?.categoryId ?? 0),
    component: rule?.component ?? '', rateBasisPoints: rule?.rateBasisPoints == null ? '' : String(rule.rateBasisPoints),
    inclusive: rule?.inclusive ?? false, requiresRegistration: rule?.requiresRegistration ?? false,
    exemptionHonored: rule?.exemptionHonored ?? true, remittedBy: rule?.remittedBy ?? 'organizer',
    effectiveFrom: timestampToDate(rule?.effectiveFrom) || utcToday(), effectiveTo: timestampToDate(rule?.effectiveTo),
  }
}

function TaxRuleSheet({ open, rule, onOpenChange, onSaved }: { open: boolean; rule: TaxRule | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const { session } = useAuth()
  const [draft, setDraft] = useState<TaxDraft>(() => taxDraft(rule))
  useEffect(() => { setDraft(taxDraft(rule)) }, [rule, open])
  const mutation = useMutation({
    mutationFn: () => {
      const body: TaxRule = {
        country: draft.country.trim().toUpperCase(), subdivision: draft.subdivision.trim().toUpperCase(),
        supplyKind: draft.supplyKind, categoryId: Number(draft.categoryId), component: draft.component.trim(),
        rateBasisPoints: Number(draft.rateBasisPoints), inclusive: draft.inclusive,
        requiresRegistration: draft.requiresRegistration, exemptionHonored: draft.exemptionHonored,
        remittedBy: draft.remittedBy, effectiveFrom: dateToTimestamp(draft.effectiveFrom),
        effectiveTo: draft.effectiveTo ? dateToTimestamp(draft.effectiveTo) : 0,
      }
      return rule?.id ? updateTaxRule(session!.token, rule.id, body) : createTaxRule(session!.token, body)
    },
    onSuccess: onSaved,
  })
  const set = <K extends keyof TaxDraft>(key: K, value: TaxDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{rule ? 'Revise tax rule' : 'Add tax rule'}</SheetTitle><SheetDescription>Changes create a new version. Previous versions remain attached to existing orders.</SheetDescription></SheetHeader>
    <form id="tax-rule-form" onSubmit={(event: FormEvent) => { event.preventDefault(); mutation.mutate() }} className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
      <div className="grid gap-4 sm:grid-cols-2"><FormField label="Country code"><Input required maxLength={2} value={draft.country} onChange={(event) => set('country', event.target.value)} placeholder="GH" /></FormField><FormField label="Subdivision" hint="Leave blank for country-wide scope."><Input value={draft.subdivision} onChange={(event) => set('subdivision', event.target.value)} placeholder="Greater Accra" /></FormField></div>
      <div className="grid gap-4 sm:grid-cols-2"><FormField label="Supply type"><select value={draft.supplyKind} onChange={(event) => set('supplyKind', event.target.value as TaxDraft['supplyKind'])} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="any">Any</option><option value="physical">Physical</option><option value="virtual">Virtual</option></select></FormField><FormField label="Category ID" hint="Use 0 for every category."><Input required type="number" min="0" step="1" value={draft.categoryId} onChange={(event) => set('categoryId', event.target.value)} /></FormField></div>
      <div className="grid gap-4 sm:grid-cols-2"><FormField label="Tax component"><Input required value={draft.component} onChange={(event) => set('component', event.target.value)} placeholder="VAT" /></FormField><FormField label="Rate (basis points)"><Input required type="number" min="0" step="1" value={draft.rateBasisPoints} onChange={(event) => set('rateBasisPoints', event.target.value)} /></FormField></div>
      <FormField label="Remitted by"><select value={draft.remittedBy} onChange={(event) => set('remittedBy', event.target.value as TaxDraft['remittedBy'])} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="organizer">Organizer</option><option value="platform">Platform</option></select></FormField>
      <div className="grid gap-4 sm:grid-cols-2"><FormField label="Effective from"><AppDatePicker value={draft.effectiveFrom} onValueChange={(value) => set('effectiveFrom', value ?? '')} /></FormField><FormField label="Effective until" hint="Leave blank for no end date."><AppDatePicker value={draft.effectiveTo} onValueChange={(value) => set('effectiveTo', value ?? '')} placeholder="No end date" /></FormField></div>
      <div className="space-y-3"><label className="flex items-center justify-between gap-3 text-sm font-medium">Tax-inclusive pricing<Switch checked={draft.inclusive} onCheckedChange={(value) => set('inclusive', value)} /></label><label className="flex items-center justify-between gap-3 text-sm font-medium">Requires registration<Switch checked={draft.requiresRegistration} onCheckedChange={(value) => set('requiresRegistration', value)} /></label><label className="flex items-center justify-between gap-3 text-sm font-medium">Honor exemptions<Switch checked={draft.exemptionHonored} onCheckedChange={(value) => set('exemptionHonored', value)} /></label></div>
      {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    </form><FormFooter id="tax-rule-form" pending={mutation.isPending} label={rule ? 'Save new version' : 'Add tax rule'} disabled={!draft.country.trim() || !draft.component.trim() || !draft.rateBasisPoints || !draft.categoryId || !draft.effectiveFrom} />
  </SheetContent></Sheet>
}

export function CommerceTaxRulesPage() {
  const { session } = useAuth(); const client = useQueryClient()
  const [country, setCountry] = useState(''); const [sheetOpen, setSheetOpen] = useState(false); const [editing, setEditing] = useState<TaxRule | null>(null)
  const query = useQuery({ queryKey: keys.tax(country), queryFn: () => listTaxRules(session!.token, country || undefined), enabled: Boolean(session?.token) })
  const rows = useMemo(() => (query.data?.taxRules ?? []).filter((rule): rule is TaxRule => Boolean(rule?.id)), [query.data])
  const openEditor = (rule?: TaxRule) => { setEditing(rule ?? null); setSheetOpen(true) }
  const saved = () => { void client.invalidateQueries({ queryKey: keys.tax(country) }); setSheetOpen(false) }
  return <section className="space-y-6"><Heading title="Tax rules" description="Set effective-dated tax treatment by country, supply type, and event category." action={<Button onClick={() => openEditor()}>Add tax rule</Button>} />
    <div className="max-w-xs"><label className="block space-y-1.5 text-sm font-medium">Filter by country<Input value={country} maxLength={2} onChange={(event) => setCountry(event.target.value.toUpperCase())} placeholder="All countries" /></label></div>
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={rows} headers={['Scope', 'Tax treatment', 'Effective period', 'Version', { label: 'Actions', className: 'text-right' }]} label="Tax rules" loading={query.isLoading} loadingMessage="Loading tax rules…" error={query.isError ? query.error.message : null} emptyMessage={country ? `No tax rules for ${country}.` : 'No tax rules configured.'} renderRow={(rule) => <TableRow key={rule.id}><TableCell><span className="block font-medium">{rule.country || 'Unknown country'}{rule.subdivision ? ` · ${rule.subdivision}` : ''}</span><span className="text-xs text-ink-muted">{rule.supplyKind || 'any'} supply · {rule.categoryId ? `Category ${rule.categoryId}` : 'All categories'}</span></TableCell><TableCell><span className="block font-medium">{rule.component || 'Tax'} · {rule.rateBasisPoints ?? 0} bps</span><span className="text-xs text-ink-muted">{rule.remittedBy || '—'} remits{rule.inclusive ? ' · inclusive' : ''}{rule.requiresRegistration ? ' · registration required' : ''}</span></TableCell><TableCell>{formatTimestamp(rule.effectiveFrom)} – {rule.effectiveTo ? formatTimestamp(rule.effectiveTo) : 'Open ended'}</TableCell><TableCell>{rule.version ?? '—'}</TableCell><TableCell className="text-right"><AppIconAction label={`Revise ${rule.component || 'tax'} rule`} icon={<span aria-hidden="true">✎</span>} onClick={() => openEditor(rule)} /></TableCell></TableRow>} containerClassName="" /></CardContent></Card>
    <TaxRuleSheet open={sheetOpen} rule={editing} onOpenChange={setSheetOpen} onSaved={saved} />
  </section>
}

type FeeDraft = { country: string; currency: string; percentBasisPoints: string; fixedPerTicketMinor: string; fixedPerOrderMinor: string; effectiveFrom: string; effectiveTo: string }
function feeDraft(rule?: FeeRule | null): FeeDraft { return { country: rule?.country ?? '', currency: rule?.currency ?? '', percentBasisPoints: rule?.percentBasisPoints == null ? '' : String(rule.percentBasisPoints), fixedPerTicketMinor: rule?.fixedPerTicketMinor == null ? '0' : String(rule.fixedPerTicketMinor), fixedPerOrderMinor: rule?.fixedPerOrderMinor == null ? '0' : String(rule.fixedPerOrderMinor), effectiveFrom: timestampToDate(rule?.effectiveFrom) || utcToday(), effectiveTo: timestampToDate(rule?.effectiveTo) } }

function FeeRuleSheet({ open, rule, onOpenChange, onSaved }: { open: boolean; rule: FeeRule | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const { session } = useAuth(); const [draft, setDraft] = useState<FeeDraft>(() => feeDraft(rule))
  useEffect(() => { setDraft(feeDraft(rule)) }, [rule, open])
  const mutation = useMutation({ mutationFn: () => {
    const body: FeeRule = { country: draft.country.trim().toUpperCase(), currency: draft.currency.trim().toUpperCase(), percentBasisPoints: Number(draft.percentBasisPoints), fixedPerTicketMinor: Number(draft.fixedPerTicketMinor), fixedPerOrderMinor: Number(draft.fixedPerOrderMinor), effectiveFrom: dateToTimestamp(draft.effectiveFrom), effectiveTo: draft.effectiveTo ? dateToTimestamp(draft.effectiveTo) : 0 }
    return rule?.id ? updateFeeRule(session!.token, rule.id, body) : createFeeRule(session!.token, body)
  }, onSuccess: onSaved })
  const set = <K extends keyof FeeDraft>(key: K, value: FeeDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{rule ? 'Revise fee rule' : 'Add fee rule'}</SheetTitle><SheetDescription>Changes create a new version. Existing orders retain their saved fee calculation.</SheetDescription></SheetHeader>
    <form id="fee-rule-form" onSubmit={(event: FormEvent) => { event.preventDefault(); mutation.mutate() }} className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
      <div className="grid gap-4 sm:grid-cols-2"><FormField label="Country code"><Input required maxLength={2} value={draft.country} onChange={(event) => set('country', event.target.value)} placeholder="GH" /></FormField><FormField label="Currency code"><Input required maxLength={3} value={draft.currency} onChange={(event) => set('currency', event.target.value)} placeholder="GHS" /></FormField></div>
      <FormField label="Percentage (basis points)" hint="For example, 500 basis points is 5%."><Input required type="number" min="0" step="1" value={draft.percentBasisPoints} onChange={(event) => set('percentBasisPoints', event.target.value)} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2"><FormField label="Fixed per ticket (minor units)"><Input required type="number" min="0" step="1" value={draft.fixedPerTicketMinor} onChange={(event) => set('fixedPerTicketMinor', event.target.value)} /></FormField><FormField label="Fixed per order (minor units)"><Input required type="number" min="0" step="1" value={draft.fixedPerOrderMinor} onChange={(event) => set('fixedPerOrderMinor', event.target.value)} /></FormField></div>
      <div className="grid gap-4 sm:grid-cols-2"><FormField label="Effective from"><AppDatePicker value={draft.effectiveFrom} onValueChange={(value) => set('effectiveFrom', value ?? '')} /></FormField><FormField label="Effective until" hint="Leave blank for no end date."><AppDatePicker value={draft.effectiveTo} onValueChange={(value) => set('effectiveTo', value ?? '')} placeholder="No end date" /></FormField></div>
      {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    </form><FormFooter id="fee-rule-form" pending={mutation.isPending} label={rule ? 'Save new version' : 'Add fee rule'} disabled={!draft.country.trim() || !draft.currency.trim() || !draft.percentBasisPoints || !draft.fixedPerTicketMinor || !draft.fixedPerOrderMinor || !draft.effectiveFrom} />
  </SheetContent></Sheet>
}

export function CommerceFeeRulesPage() {
  const { session } = useAuth(); const client = useQueryClient()
  const [country, setCountry] = useState(''); const [sheetOpen, setSheetOpen] = useState(false); const [editing, setEditing] = useState<FeeRule | null>(null)
  const query = useQuery({ queryKey: keys.fees(country), queryFn: () => listFeeRules(session!.token, country || undefined), enabled: Boolean(session?.token) })
  const rows = useMemo(() => (query.data?.feeRules ?? []).filter((rule): rule is FeeRule => Boolean(rule?.id)), [query.data])
  const openEditor = (rule?: FeeRule) => { setEditing(rule ?? null); setSheetOpen(true) }
  const saved = () => { void client.invalidateQueries({ queryKey: keys.fees(country) }); setSheetOpen(false) }
  return <section className="space-y-6"><Heading title="Fee rules" description="Configure platform fees by country and currency, with effective dates for future orders." action={<Button onClick={() => openEditor()}>Add fee rule</Button>} />
    <div className="max-w-xs"><label className="block space-y-1.5 text-sm font-medium">Filter by country<Input value={country} maxLength={2} onChange={(event) => setCountry(event.target.value.toUpperCase())} placeholder="All countries" /></label></div>
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={rows} headers={['Country and currency', 'Fee', 'Effective period', 'Version', { label: 'Actions', className: 'text-right' }]} label="Fee rules" loading={query.isLoading} loadingMessage="Loading fee rules…" error={query.isError ? query.error.message : null} emptyMessage={country ? `No fee rules for ${country}.` : 'No fee rules configured.'} renderRow={(rule) => <TableRow key={rule.id}><TableCell><span className="block font-medium">{rule.country || '—'}</span><span className="text-xs text-ink-muted">{rule.currency || '—'}</span></TableCell><TableCell><span className="block font-medium">{rule.percentBasisPoints ?? 0} bps</span><span className="text-xs text-ink-muted">{rule.currency && rule.fixedPerTicketMinor != null ? `${safeMoney(rule.fixedPerTicketMinor, rule.currency)} / ticket` : '— / ticket'} · {rule.currency && rule.fixedPerOrderMinor != null ? `${safeMoney(rule.fixedPerOrderMinor, rule.currency)} / order` : '— / order'}</span></TableCell><TableCell>{formatTimestamp(rule.effectiveFrom)} – {rule.effectiveTo ? formatTimestamp(rule.effectiveTo) : 'Open ended'}</TableCell><TableCell>{rule.version ?? '—'}</TableCell><TableCell className="text-right"><AppIconAction label="Revise fee rule" icon={<span aria-hidden="true">✎</span>} onClick={() => openEditor(rule)} /></TableCell></TableRow>} containerClassName="" /></CardContent></Card>
    <FeeRuleSheet open={sheetOpen} rule={editing} onOpenChange={setSheetOpen} onSaved={saved} />
  </section>
}

export function CommerceSettingsPage() {
  const { session } = useAuth(); const client = useQueryClient()
  const query = useQuery({ queryKey: keys.settings, queryFn: () => getCommerceSettings(session!.token), enabled: Boolean(session?.token) })
  const [payer, setPayer] = useState<NonNullable<CommerceSettings['defaultFeePayer']>>('attendee')
  useEffect(() => { if (query.data?.defaultFeePayer) setPayer(query.data.defaultFeePayer) }, [query.data])
  const mutation = useMutation({ mutationFn: () => updateCommerceSettings(session!.token, { defaultFeePayer: payer }), onSuccess: async (data) => { client.setQueryData(keys.settings, data); await client.invalidateQueries({ queryKey: keys.settings }) } })
  return <section className="space-y-6"><Heading title="Commerce settings" description="Choose who pays the platform fee when an order is priced." />{query.isError && <ErrorMessage>{query.error.message}</ErrorMessage>}{mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    <Card><CardHeader><CardTitle>Default fee payer</CardTitle></CardHeader><CardContent className="space-y-5"><p className="max-w-2xl text-sm leading-6 text-ink-muted">This default applies to orders calculated after the setting is saved. An organization can have its own fee-payer override.</p><div className="flex flex-wrap items-center gap-4"><select aria-label="Default fee payer" value={payer} onChange={(event) => setPayer(event.target.value as typeof payer)} disabled={query.isLoading} className="h-10 min-w-56 rounded-lg border border-line bg-surface px-3 text-sm"><option value="attendee">Attendee</option><option value="organizer">Organizer</option></select><Button onClick={() => mutation.mutate()} disabled={query.isLoading || mutation.isPending || payer === (query.data?.defaultFeePayer ?? 'attendee')}>{mutation.isPending ? 'Saving…' : 'Save setting'}</Button></div>{mutation.isSuccess && <p role="status" className="text-sm text-success">Commerce setting saved.</p>}</CardContent></Card>
  </section>
}

export function CommerceTaxExemptionsPage() {
  const { session } = useAuth(); const client = useQueryClient()
  const organizationsQuery = useQuery({ queryKey: keys.organizations, queryFn: () => listAdminOrganizations(session!.token), enabled: Boolean(session?.token) })
  const organizations = organizationsQuery.data?.organizations ?? []
  const [selectedId, setSelectedId] = useState('')
  const organizationId = selectedId || organizations[0]?.id || ''
  const profileQuery = useQuery({ queryKey: keys.profile(organizationId), queryFn: () => getOrganizationCommerceProfile(session!.token, organizationId), enabled: Boolean(session?.token && organizationId) })
  const mutation = useMutation({ mutationFn: (input: { country: string; subdivision?: string; status: 'approved' | 'rejected' }) => reviewOrganizationTaxExemption(session!.token, organizationId, input), onSuccess: async (profile) => { client.setQueryData(keys.profile(organizationId), profile); await client.invalidateQueries({ queryKey: keys.profile(organizationId) }) } })
  const exemptions = (profileQuery.data?.exemptions ?? []).filter((exemption): exemption is NonNullable<typeof exemption> => Boolean(exemption))
  return <section className="space-y-6"><Heading title="Tax exemptions" description="Review exemption evidence submitted by organizations." />
    <div className="max-w-xl"><label className="block space-y-1.5 text-sm font-medium">Organization<select aria-label="Organization" value={organizationId} onChange={(event) => setSelectedId(event.target.value)} disabled={organizationsQuery.isLoading || organizations.length === 0} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">{organizationsQuery.isLoading ? 'Loading organizations…' : 'Select an organization'}</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name || organization.id}</option>)}</select></label>{organizationsQuery.isError && <ErrorMessage>{organizationsQuery.error.message}</ErrorMessage>}</div>
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={exemptions} headers={['Jurisdiction', 'Evidence', 'Status', { label: 'Actions', className: 'text-right' }]} label="Organization tax exemptions" loading={profileQuery.isLoading} loadingMessage="Loading exemption profile…" error={profileQuery.isError ? profileQuery.error.message : null} emptyMessage={organizationId ? 'This organization has no tax exemptions.' : 'Select an organization to review exemptions.'} renderRow={(exemption, index) => { const evidenceUrl = safeEvidenceUrl(exemption.evidenceRef); return <TableRow key={`${exemption.country ?? 'country'}-${exemption.subdivision ?? index}`}><TableCell><span className="block font-medium">{exemption.country || 'Unknown country'}</span><span className="text-xs text-ink-muted">{exemption.subdivision || 'All subdivisions'}</span></TableCell><TableCell>{evidenceUrl ? <a href={evidenceUrl} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">View evidence</a> : exemption.evidenceRef ? 'Evidence reference unavailable' : 'No evidence reference'}</TableCell><TableCell>{statusBadge(exemption.status)}</TableCell><TableCell className="text-right">{exemption.status === 'pending' && exemption.country ? <div className="flex justify-end gap-1"><AppIconAction label="Approve exemption" icon={<span aria-hidden="true">✓</span>} disabled={mutation.isPending} onClick={() => mutation.mutate({ country: exemption.country!, subdivision: exemption.subdivision || undefined, status: 'approved' })} /><AppIconAction label="Reject exemption" icon={<span aria-hidden="true">×</span>} disabled={mutation.isPending} onClick={() => mutation.mutate({ country: exemption.country!, subdivision: exemption.subdivision || undefined, status: 'rejected' })} /></div> : '—'}</TableCell></TableRow> }} containerClassName="" /></CardContent></Card>
    {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
  </section>
}

function PayoutDetails({ payout }: { payout: Payout }) {
  const scheduled = payout.scheduledFor ? formatTimestamp(payout.scheduledFor) : '—'
  const amount = payout.amountMinor != null && payout.currency ? safeMoney(payout.amountMinor, payout.currency) : '—'
  const fields = [['Amount', amount], ['Status', payout.status || '—'], ['Beneficiary', payout.beneficiaryId || '—'], ['Beneficiary type', payout.beneficiaryType || '—'], ['Event', payout.eventId || '—'], ['Provider', payout.provider || '—'], ['Provider reference', payout.providerRef || '—'], ['Attempts', payout.attempts == null ? '—' : String(payout.attempts)], ['Scheduled for', scheduled]]
  return <dl className="grid gap-4 px-6 pb-6 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt><dd className="mt-1 break-all text-sm font-medium">{value}</dd></div>)}</dl>
}

export function CommercePayoutsPage() {
  const { session } = useAuth(); const [statusDraft, setStatusDraft] = useState(''); const [status, setStatus] = useState('')
  const [pageIndex, setPageIndex] = useState(0); const [pageSize, setPageSize] = useState(10); const [detailId, setDetailId] = useState('')
  const query = useQuery({ queryKey: keys.payouts(status, pageIndex, pageSize), queryFn: () => listAdminPayouts(session!.token, { limit: pageSize, offset: pageIndex * pageSize, status: status || undefined }), enabled: Boolean(session?.token) })
  const detailsQuery = useQuery({ queryKey: keys.payout(detailId), queryFn: () => getAdminPayout(session!.token, detailId), enabled: Boolean(session?.token && detailId) })
  const payouts = (query.data?.payouts ?? []).filter((payout): payout is Payout => Boolean(payout?.id))
  const total = query.data?.total ?? 0; const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return <section className="space-y-6"><Heading title="Payouts" description="Review payout transfers across organizations and inspect their details." />
    <form className="flex max-w-xl items-end gap-3" onSubmit={(event) => { event.preventDefault(); setPageIndex(0); setStatus(statusDraft.trim()) }}><label className="min-w-0 flex-1 space-y-1.5 text-sm font-medium">Filter by status<Input value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)} placeholder="All statuses" /></label><Button type="submit" variant="outline">Apply filter</Button></form>
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={payouts} headers={['Payout', 'Beneficiary', { label: 'Amount', className: 'text-right' }, 'Status', 'Scheduled', { label: 'Actions', className: 'text-right' }]} label="Payouts" loading={query.isLoading} loadingMessage="Loading payouts…" error={query.isError ? query.error.message : null} emptyMessage={status ? `No payouts with status “${status}”.` : 'No payouts found.'} pagination={{ pageIndex, pageSize, totalItems: total, onPageChange: (index) => setPageIndex(Math.min(index, pageCount - 1)), onPageSizeChange: (size) => { setPageSize(size); setPageIndex(0) } }} renderRow={(payout) => <TableRow key={payout.id}><TableCell><span className="block font-medium">{payout.id}</span><span className="text-xs text-ink-muted">{payout.eventId ? `Event ${payout.eventId}` : 'Platform payout'}</span></TableCell><TableCell><span className="block font-medium">{payout.beneficiaryId || 'Unknown beneficiary'}</span><span className="text-xs text-ink-muted">{payout.beneficiaryType || 'Type unavailable'}</span></TableCell><TableCell className="text-right">{payout.amountMinor != null && payout.currency ? safeMoney(payout.amountMinor, payout.currency) : '—'}</TableCell><TableCell>{statusBadge(payout.status)}</TableCell><TableCell>{payout.scheduledFor ? formatTimestamp(payout.scheduledFor) : '—'}</TableCell><TableCell className="text-right"><AppIconAction label={`View payout ${payout.id}`} icon={<span aria-hidden="true">↗</span>} onClick={() => setDetailId(payout.id!)} /></TableCell></TableRow>} containerClassName="" /></CardContent></Card>
    <Sheet open={Boolean(detailId)} onOpenChange={(open) => { if (!open) setDetailId('') }}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>Payout details</SheetTitle><SheetDescription>{detailsQuery.data?.id || detailId}</SheetDescription></SheetHeader>{detailsQuery.isLoading ? <p className="px-6 py-8 text-sm text-ink-muted">Loading payout…</p> : detailsQuery.isError ? <div className="px-6 pb-6"><ErrorMessage>{detailsQuery.error.message}</ErrorMessage></div> : detailsQuery.data ? <PayoutDetails payout={detailsQuery.data} /> : null}</SheetContent></Sheet>
  </section>
}
