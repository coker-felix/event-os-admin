import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/date-format'
import {
  createCountry, createDistributionChannel, createEventCategory, createSubdivision, getSiteConfig, listCountries,
  listDistributionChannels, listEventCategories, listSubdivisions, putSiteConfig, updateCountry,
  updateDistributionChannel, updateEventCategory, updateSubdivision,
  type DistributionChannel, type EventCategory, type SiteConfig, type SupportedCountry, type SupportedSubdivision,
} from '@/services/admin-platform'

const keys = {
  config: ['qk-admin-platform-config'] as const,
  countries: ['qk-admin-platform-countries'] as const,
  channels: ['qk-admin-platform-distribution-channels'] as const,
  categories: ['qk-admin-platform-event-categories'] as const,
  subdivisions: (country: string) => ['qk-admin-platform-subdivisions', country] as const,
}

function PlatformHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Platform</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">{description}</p></div>{action}</div>
}

function ErrorMessage({ children }: { children: string }) {
  return <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return enabled ? <Badge className="bg-success-soft text-success">Enabled</Badge> : <Badge variant="outline">Disabled</Badge>
}

function PlatformForm({ id, onSubmit, children, error, pending, submitLabel }: { id: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: ReactNode; error?: string; pending: boolean; submitLabel: string }) {
  return <><form id={id} onSubmit={onSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">{children}{error && <ErrorMessage>{error}</ErrorMessage>}</form><SheetFooter className="border-t border-line"><Button type="submit" form={id} disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button></SheetFooter></>
}

export function PlatformSettingsPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const query = useQuery({ queryKey: keys.config, queryFn: () => getSiteConfig(session!.token), enabled: Boolean(session?.token) })
  const [draft, setDraft] = useState<SiteConfig | null>(null)
  const form = draft ?? query.data ?? {}
  const save = useMutation({ mutationFn: () => putSiteConfig(session!.token, form), onSuccess: async (data) => { client.setQueryData(keys.config, data); setDraft(data); await client.invalidateQueries({ queryKey: keys.config }) } })
  const set = (name: keyof SiteConfig, value: string) => setDraft((current) => ({ ...(current ?? query.data ?? {}), [name]: value }))
  const field = (key: keyof SiteConfig, label: string, type = 'text') => <label className="block space-y-1.5 text-sm font-medium">{label}<Input type={type} value={typeof form[key] === 'string' ? form[key] as string : ''} onChange={(event) => set(key, event.target.value)} /></label>
  return <section className="space-y-6">
    <PlatformHeading title="Platform settings" description="Manage the public site identity, support contacts, and event callout categories." />
    <Card><CardHeader className="border-b border-line"><CardTitle>Website configuration</CardTitle><p data-slot="card-description" className="text-sm text-ink-muted">Saving replaces the complete configuration. Blank fields will be cleared.</p></CardHeader><CardContent className="space-y-5">
      {query.isLoading ? <p className="text-sm text-ink-muted">Loading platform settings…</p> : query.isError ? <ErrorMessage>{query.error.message}</ErrorMessage> : <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
        <div className="grid gap-4 sm:grid-cols-2">{field('siteName', 'Site name')}{field('tagline', 'Tagline')}{field('logoUrl', 'Logo URL', 'url')}{field('defaultCurrency', 'Default currency')}{field('supportEmail', 'Support email', 'email')}{field('supportPhone', 'Support phone')}</div>
        <label className="block space-y-1.5 text-sm font-medium">Announcement<textarea value={form.announcement || ''} onChange={(event) => set('announcement', event.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
        <label className="block space-y-1.5 text-sm font-medium">Allowed callout categories <span className="font-normal text-ink-muted">(one per line)</span><textarea value={(form.calloutAllowedCategories ?? []).join('\n')} onChange={(event) => setDraft((current) => ({ ...(current ?? query.data ?? {}), calloutAllowedCategories: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) }))} rows={4} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
        {save.isError && <ErrorMessage>{save.error.message}</ErrorMessage>}
        {query.data?.updatedAt && <p className="text-xs text-ink-muted">Last updated {formatDate(query.data.updatedAt.slice(0, 10))}{query.data.updatedBy ? ` by ${query.data.updatedBy}` : ''}</p>}
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</Button>
      </form>}
    </CardContent></Card>
  </section>
}

export function PlatformCountriesPage() {
  const { session } = useAuth(); const client = useQueryClient()
  const query = useQuery({ queryKey: keys.countries, queryFn: () => listCountries(session!.token), enabled: Boolean(session?.token) })
  const [search, setSearch] = useState(''); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<SupportedCountry | null>(null)
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [enabled, setEnabled] = useState(true)
  const countries = query.data?.countries ?? []
  const filtered = useMemo(() => countries.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase())), [countries, search])
  const refresh = () => client.invalidateQueries({ queryKey: keys.countries })
  const save = useMutation({ mutationFn: () => editing ? updateCountry(session!.token, editing.code, { name: name.trim(), enabled }) : createCountry(session!.token, { code: code.trim().toUpperCase(), name: name.trim(), enabled }), onSuccess: async () => { await refresh(); setOpen(false) } })
  const toggle = useMutation({ mutationFn: (country: SupportedCountry) => updateCountry(session!.token, country.code, { enabled: !country.enabled }), onSuccess: refresh })
  const openEditor = (country?: SupportedCountry) => { setEditing(country ?? null); setCode(country?.code ?? ''); setName(country?.name ?? ''); setEnabled(country?.enabled ?? true); save.reset(); setOpen(true) }
  return <section className="space-y-6"><PlatformHeading title="Countries" description="Manage the countries that can be selected across Event OS." action={<Button onClick={() => openEditor()}>Add country</Button>} />
    <Card><CardContent className="p-0"><div className="flex justify-end p-4"><Input aria-label="Search countries" placeholder="Search countries" value={search} onChange={(event) => setSearch(event.target.value)} className="sm:w-64" /></div>{toggle.isError && <div className="px-5 pt-4"><ErrorMessage>{toggle.error.message}</ErrorMessage></div>}<DataTable data={filtered} headers={['Country', 'Code', 'Status', { label: 'Actions', className: 'text-right' }]} label="Countries" loading={query.isLoading} loadingMessage="Loading countries…" error={query.isError ? query.error.message : null} emptyMessage={search ? 'No countries match your search.' : 'No countries are configured.'} renderRow={(country) => <TableRow key={country.code}><TableCell><span className="font-medium">{country.name}</span></TableCell><TableCell className="font-mono text-xs">{country.code}</TableCell><TableCell><EnabledBadge enabled={country.enabled} /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`Edit ${country.name}`} icon={<span aria-hidden="true">✎</span>} onClick={() => openEditor(country)} /><AppIconAction label={`${country.enabled ? 'Disable' : 'Enable'} ${country.name}`} icon={<span aria-hidden="true">{country.enabled ? 'Ⅱ' : '▶'}</span>} disabled={toggle.isPending} onClick={() => toggle.mutate(country)} /></div></TableCell></TableRow>} containerClassName="" /></CardContent></Card>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{editing ? `Edit ${editing.name}` : 'Add country'}</SheetTitle><SheetDescription>Country codes use ISO 3166-1 alpha-2 and cannot be changed after creation.</SheetDescription></SheetHeader><PlatformForm id="country-form" onSubmit={(event) => { event.preventDefault(); save.mutate() }} error={save.isError ? save.error.message : undefined} pending={save.isPending} submitLabel={editing ? 'Save changes' : 'Add country'}>
      {!editing && <label className="block space-y-1.5 text-sm font-medium">Country code<Input required minLength={2} maxLength={2} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>}
      <label className="block space-y-1.5 text-sm font-medium">Country name<Input required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="flex items-center justify-between gap-3 text-sm font-medium">Enabled<Switch checked={enabled} onCheckedChange={setEnabled} /></label>
    </PlatformForm></SheetContent></Sheet>
  </section>
}

export function PlatformSubdivisionsPage() {
  const { session } = useAuth(); const client = useQueryClient()
  const countriesQuery = useQuery({ queryKey: keys.countries, queryFn: () => listCountries(session!.token), enabled: Boolean(session?.token) })
  const [countryCode, setCountryCode] = useState(''); const query = useQuery({ queryKey: keys.subdivisions(countryCode), queryFn: () => listSubdivisions(session!.token, countryCode), enabled: Boolean(session?.token && countryCode) })
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<SupportedSubdivision | null>(null); const [code, setCode] = useState(''); const [name, setName] = useState(''); const [enabled, setEnabled] = useState(true)
  const subdivisions = query.data?.subdivisions ?? []; const refresh = () => client.invalidateQueries({ queryKey: keys.subdivisions(countryCode) })
  const save = useMutation({ mutationFn: () => editing ? updateSubdivision(session!.token, editing.code, { name: name.trim(), enabled }) : createSubdivision(session!.token, countryCode, { code: code.trim().toUpperCase(), name: name.trim(), enabled }), onSuccess: async () => { await refresh(); setOpen(false) } })
  const toggle = useMutation({ mutationFn: (item: SupportedSubdivision) => updateSubdivision(session!.token, item.code, { enabled: !item.enabled }), onSuccess: refresh })
  const openEditor = (item?: SupportedSubdivision) => { setEditing(item ?? null); setCode(item?.code ?? `${countryCode}-`); setName(item?.name ?? ''); setEnabled(item?.enabled ?? true); save.reset(); setOpen(true) }
  return <section className="space-y-6"><PlatformHeading title="Subdivisions" description="Manage states, provinces, and regions within supported countries." action={<Button disabled={!countryCode} onClick={() => openEditor()}>Add subdivision</Button>} />
    <Card><CardContent className="p-0"><div className="flex justify-end p-4"><select aria-label="Choose country" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} disabled={countriesQuery.isLoading || countriesQuery.isError} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm sm:w-72"><option value="">Choose a country</option>{(countriesQuery.data?.countries ?? []).map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}</select></div>{toggle.isError && <div className="px-5 pt-4"><ErrorMessage>{toggle.error.message}</ErrorMessage></div>}<DataTable data={subdivisions} headers={['Subdivision', 'Code', 'Status', { label: 'Actions', className: 'text-right' }]} label="Subdivisions" loading={Boolean(countryCode && query.isLoading)} loadingMessage="Loading subdivisions…" error={countriesQuery.isError ? countriesQuery.error.message : query.isError ? query.error.message : null} emptyMessage={countryCode ? 'No subdivisions are configured for this country.' : 'Select a country to view its subdivisions.'} renderRow={(item) => <TableRow key={item.code}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="font-mono text-xs">{item.code}</TableCell><TableCell><EnabledBadge enabled={item.enabled} /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`Edit ${item.name}`} icon={<span aria-hidden="true">✎</span>} onClick={() => openEditor(item)} /><AppIconAction label={`${item.enabled ? 'Disable' : 'Enable'} ${item.name}`} icon={<span aria-hidden="true">{item.enabled ? 'Ⅱ' : '▶'}</span>} disabled={toggle.isPending} onClick={() => toggle.mutate(item)} /></div></TableCell></TableRow>} containerClassName="" /></CardContent></Card>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{editing ? `Edit ${editing.name}` : 'Add subdivision'}</SheetTitle><SheetDescription>Use the full ISO 3166-2 code, including the country prefix.</SheetDescription></SheetHeader><PlatformForm id="subdivision-form" onSubmit={(event) => { event.preventDefault(); save.mutate() }} error={save.isError ? save.error.message : undefined} pending={save.isPending} submitLabel={editing ? 'Save changes' : 'Add subdivision'}>
      {!editing && <label className="block space-y-1.5 text-sm font-medium">Subdivision code<Input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={`${countryCode}-AA`} /></label>}
      <label className="block space-y-1.5 text-sm font-medium">Subdivision name<Input required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="flex items-center justify-between gap-3 text-sm font-medium">Enabled<Switch checked={enabled} onCheckedChange={setEnabled} /></label>
    </PlatformForm></SheetContent></Sheet>
  </section>
}

export function PlatformDistributionChannelsPage() {
  const { session } = useAuth(); const client = useQueryClient(); const query = useQuery({ queryKey: keys.channels, queryFn: () => listDistributionChannels(session!.token), enabled: Boolean(session?.token) })
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<DistributionChannel | null>(null); const [key, setKey] = useState(''); const [displayName, setDisplayName] = useState(''); const [adapterType, setAdapterType] = useState<DistributionChannel['adapterType']>('website'); const [configRef, setConfigRef] = useState(''); const [enabled, setEnabled] = useState(true)
  const rows = query.data?.distributionChannels ?? []; const refresh = () => client.invalidateQueries({ queryKey: keys.channels })
  const save = useMutation({ mutationFn: () => editing ? updateDistributionChannel(session!.token, editing.key, { displayName: displayName.trim(), configRef: configRef.trim(), enabled }) : createDistributionChannel(session!.token, { key: key.trim(), displayName: displayName.trim(), adapterType, configRef: configRef.trim() || undefined, enabled }), onSuccess: async () => { await refresh(); setOpen(false) } })
  const toggle = useMutation({ mutationFn: (row: DistributionChannel) => updateDistributionChannel(session!.token, row.key, { enabled: !row.enabled }), onSuccess: refresh })
  const openEditor = (row?: DistributionChannel) => { setEditing(row ?? null); setKey(row?.key ?? ''); setDisplayName(row?.displayName ?? ''); setAdapterType(row?.adapterType ?? 'website'); setConfigRef(row?.configRef ?? ''); setEnabled(row?.enabled ?? true); save.reset(); setOpen(true) }
  return <section className="space-y-6"><PlatformHeading title="Distribution channels" description="Configure the ways attendees discover and access ticket sales." action={<Button onClick={() => openEditor()}>Add channel</Button>} />{toggle.isError && <ErrorMessage>{toggle.error.message}</ErrorMessage>}
    <Card><CardContent className="p-0"><DataTable data={rows} headers={['Channel', 'Adapter', 'Configuration reference', 'Status', { label: 'Actions', className: 'text-right' }]} label="Distribution channels" loading={query.isLoading} loadingMessage="Loading distribution channels…" error={query.isError ? query.error.message : null} emptyMessage="No distribution channels are configured." renderRow={(row) => <TableRow key={row.key}><TableCell><span className="block font-medium">{row.displayName}</span><span className="mt-0.5 block font-mono text-xs text-ink-muted">{row.key}</span></TableCell><TableCell><span className="capitalize">{row.adapterType}</span><span className="mt-0.5 block text-xs text-ink-muted">{row.adapterImplemented ? 'Adapter available' : 'Adapter not implemented'}</span></TableCell><TableCell>{row.configRef || '—'}</TableCell><TableCell><EnabledBadge enabled={row.enabled} /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`Edit ${row.displayName}`} icon={<span aria-hidden="true">✎</span>} onClick={() => openEditor(row)} /><AppIconAction label={`${row.enabled ? 'Disable' : 'Enable'} ${row.displayName}`} icon={<span aria-hidden="true">{row.enabled ? 'Ⅱ' : '▶'}</span>} disabled={toggle.isPending} onClick={() => toggle.mutate(row)} /></div></TableCell></TableRow>} containerClassName="" /></CardContent></Card>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{editing ? `Edit ${editing.displayName}` : 'Add distribution channel'}</SheetTitle><SheetDescription>Channel keys and adapter types cannot be changed after creation. Do not enter secrets in the configuration reference.</SheetDescription></SheetHeader><PlatformForm id="channel-form" onSubmit={(event) => { event.preventDefault(); save.mutate() }} error={save.isError ? save.error.message : undefined} pending={save.isPending} submitLabel={editing ? 'Save changes' : 'Add channel'}>
      {!editing && <label className="block space-y-1.5 text-sm font-medium">Channel key<Input required value={key} onChange={(event) => setKey(event.target.value)} /></label>}
      <label className="block space-y-1.5 text-sm font-medium">Display name<Input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
      {!editing && <label className="block space-y-1.5 text-sm font-medium">Adapter type<select value={adapterType} onChange={(event) => setAdapterType(event.target.value as DistributionChannel['adapterType'])} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="website">Website</option><option value="ussd">USSD</option><option value="whatsapp">WhatsApp</option></select></label>}
      <label className="block space-y-1.5 text-sm font-medium">Configuration reference<Input value={configRef} onChange={(event) => setConfigRef(event.target.value)} /></label><label className="flex items-center justify-between gap-3 text-sm font-medium">Enabled<Switch checked={enabled} onCheckedChange={setEnabled} /></label>
    </PlatformForm></SheetContent></Sheet>
  </section>
}

export function PlatformEventCategoriesPage() {
  const { session } = useAuth(); const client = useQueryClient(); const query = useQuery({ queryKey: keys.categories, queryFn: () => listEventCategories(session!.token), enabled: Boolean(session?.token) })
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<EventCategory | null>(null); const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [active, setActive] = useState(true)
  const rows = query.data?.categories ?? []; const refresh = () => client.invalidateQueries({ queryKey: keys.categories })
  const save = useMutation({ mutationFn: () => editing ? updateEventCategory(session!.token, editing.id, { name: name.trim(), description: description.trim(), active }) : createEventCategory(session!.token, { name: name.trim(), description: description.trim() || undefined }), onSuccess: async () => { await refresh(); setOpen(false) } })
  const toggle = useMutation({ mutationFn: (row: EventCategory) => updateEventCategory(session!.token, row.id, { active: !row.active }), onSuccess: refresh })
  const openEditor = (row?: EventCategory) => { setEditing(row ?? null); setName(row?.name ?? ''); setDescription(row?.description ?? ''); setActive(row?.active ?? true); save.reset(); setOpen(true) }
  return <section className="space-y-6"><PlatformHeading title="Event categories" description="Manage the categories organizers can assign to their events." action={<Button onClick={() => openEditor()}>Add category</Button>} />{toggle.isError && <ErrorMessage>{toggle.error.message}</ErrorMessage>}
    <Card><CardContent className="p-0"><DataTable data={rows} headers={['Category', 'Slug', 'Status', { label: 'Actions', className: 'text-right' }]} label="Event categories" loading={query.isLoading} loadingMessage="Loading event categories…" error={query.isError ? query.error.message : null} emptyMessage="No event categories are configured." renderRow={(row) => <TableRow key={row.id}><TableCell><span className="block font-medium">{row.name}</span><span className="mt-0.5 block text-xs text-ink-muted">{row.description || 'No description'}</span></TableCell><TableCell className="font-mono text-xs">{row.slug}</TableCell><TableCell><EnabledBadge enabled={row.active} /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`Edit ${row.name}`} icon={<span aria-hidden="true">✎</span>} onClick={() => openEditor(row)} /><AppIconAction label={`${row.active ? 'Disable' : 'Enable'} ${row.name}`} icon={<span aria-hidden="true">{row.active ? 'Ⅱ' : '▶'}</span>} disabled={toggle.isPending} onClick={() => toggle.mutate(row)} /></div></TableCell></TableRow>} containerClassName="" /></CardContent></Card>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{editing ? `Edit ${editing.name}` : 'Add event category'}</SheetTitle><SheetDescription>The category slug is assigned from its name and cannot be edited.</SheetDescription></SheetHeader><PlatformForm id="category-form" onSubmit={(event) => { event.preventDefault(); save.mutate() }} error={save.isError ? save.error.message : undefined} pending={save.isPending} submitLabel={editing ? 'Save changes' : 'Add category'}>
      <label className="block space-y-1.5 text-sm font-medium">Name<Input required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="block space-y-1.5 text-sm font-medium">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>{editing && <label className="flex items-center justify-between gap-3 text-sm font-medium">Active<Switch checked={active} onCheckedChange={setActive} /></label>}
    </PlatformForm></SheetContent></Sheet>
  </section>
}

export function PlatformSponsorsPage() {
  return <section className="space-y-6"><PlatformHeading title="Sponsors" description="Review and manage sponsor catalog entries." /><Card><CardHeader><CardTitle>Sponsor catalog</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-ink-muted">The admin API currently exposes update and delete operations for a sponsor when its ID is known. It does not expose an admin list or create operation, so this page cannot load or add sponsor records yet.</p></CardContent></Card></section>
}
