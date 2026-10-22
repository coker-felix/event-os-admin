import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CaretDownIcon } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/auth'
import { AppDatePicker } from '@/components/ui/date-picker'
import { AppIconAction } from '@/components/ui/app-icon-action'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { FilterTabs } from '@/components/ui/filter-tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/date-format'
import { listAdminOrganizations, listVenueDirectory, getAdminVenue, type AdminOrganization, type VenueDirectoryEntry } from '@/services/admin-account-directory'
import { listCountries, listEventCategories, type EventCategory, type SupportedCountry } from '@/services/admin-platform'
import {
  createAdminEvent, createAdminRecurringEvents, createAdminTicketType, deleteAdminTicketType, getAdminEvent, listAdminEventOrders, listAdminEvents, listAdminTicketTypes, publishAdminEvent, updateAdminEvent, updateAdminTicketType,
  type AdminEvent, type AdminEventInput, type AdminRecurringEventsInput, type AdminOrder, type AdminTicketType, type AdminTicketTypeInput,
} from '@/services/admin-events-ticketing'

const eventsKey = ['qk-admin-events'] as const
const orgsKey = ['qk-admin-organizations'] as const
const venuesKey = ['qk-admin-venues'] as const
type EventStatusFilter = '' | 'draft' | 'published' | 'cancelled' | 'completed'

function eventKey(id: string) { return [...eventsKey, 'detail', id] as const }
function ticketKey(id: string) { return [...eventsKey, id, 'ticket-types'] as const }
function ordersKey(id: string, offset: number) { return [...eventsKey, id, 'orders', offset] as const }

function eventDateParts(seconds?: number | string | null) {
  const timestamp = Number(seconds)
  if (seconds === null || seconds === undefined || !Number.isFinite(timestamp) || timestamp <= 0) return { date: null, time: '' }
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
}

function toUnixSeconds(date: string | null, time: string) {
  if (!date || !time) return null
  const parsed = new Date(`${date}T${time}:00`)
  return Number.isFinite(parsed.getTime()) ? Math.floor(parsed.getTime() / 1000) : null
}

function displayDateTime(seconds?: number | string | null, timezone?: string | null) {
  const timestamp = Number(seconds)
  if (seconds === null || seconds === undefined || !Number.isFinite(timestamp) || timestamp <= 0) return 'Date unavailable'
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone || undefined }).format(timestamp * 1000)
  } catch {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp * 1000)
  }
}

function statusBadge(status?: string | null) {
  if (status === 'published' || status === 'completed') return <Badge className="bg-success-soft text-success">{status}</Badge>
  if (status === 'cancelled') return <Badge className="bg-danger-soft text-danger">Cancelled</Badge>
  if (status === 'draft') return <Badge className="bg-warning-soft text-warning">Draft</Badge>
  return <Badge variant="outline">{status || 'Unknown'}</Badge>
}

function formatMinor(minor?: number | string | null, currency?: string | null) {
  if (minor === null || minor === undefined || (typeof minor === 'number' && (!Number.isFinite(minor) || !Number.isInteger(minor)))) return '—'
  const code = currency?.trim().toUpperCase() || 'XXX'
  let scale = 2
  try { scale = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2 } catch { /* fallback scale */ }
  let value: bigint
  try { value = BigInt(minor) } catch { return '—' }
  const negative = value < 0n
  const absolute = negative ? -value : value
  const divisor = 10n ** BigInt(scale)
  const whole = absolute / divisor
  const fraction = scale ? `.${String(absolute % divisor).padStart(scale, '0')}` : ''
  const grouped = new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(whole)
  return `${code} ${negative ? '-' : ''}${grouped}${fraction}`
}

function ErrorMessage({ children }: { children: string }) {
  return <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>
}

type SearchableOption = { value: string; label: string; searchText?: string }

function SearchableOptionField({
  label, value, onChange, options, placeholder, searchPlaceholder, emptyMessage, loading, error, emptyOption,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  loading?: boolean
  error?: string
  emptyOption?: SearchableOption
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)
  return <label className="block space-y-2.5 text-sm font-medium">{label}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal" disabled={Boolean(loading || error || (!options.length && !emptyOption))} />}>
        <span className="truncate">{loading ? 'Loading options…' : selected?.label || (emptyOption?.value === value ? emptyOption.label : value || placeholder)}</span><CaretDownIcon aria-hidden="true" className="shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] max-w-[calc(100vw-3rem)] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {emptyOption && <CommandItem value={`${emptyOption.label} ${emptyOption.searchText || ''}`} onSelect={() => { onChange(emptyOption.value); setOpen(false) }}>{emptyOption.label}</CommandItem>}
              {options.map((option) => <CommandItem key={option.value} value={`${option.label} ${option.searchText || ''}`} onSelect={() => { onChange(option.value); setOpen(false) }}>{option.label}</CommandItem>)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {error && <span role="alert" className="block text-xs font-normal text-danger">Could not load {label.toLowerCase()} options: {error}</span>}
    {!loading && !error && options.length === 0 && <span className="block text-xs font-normal text-ink-muted">No {label.toLowerCase()} options are configured.</span>}
  </label>
}

function getCurrencyOptions(selectedCurrency: string): SearchableOption[] {
  const fallback = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'XOF', 'XAF', 'LRD', 'ZAR', 'KES']
  const codes = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : fallback
  const displayNames = new Intl.DisplayNames(undefined, { type: 'currency' })
  return [...new Set([...codes, selectedCurrency].filter(Boolean))].sort().map((code) => {
    let name = code
    try { name = displayNames.of(code) || code } catch { /* Preserve unknown existing currency codes. */ }
    return { value: code, label: `${code} · ${name}`, searchText: name }
  })
}

function EventForm({
  event, organizations, onSaved,
}: { event?: AdminEvent | null; organizations: AdminOrganization[]; onSaved: (event: AdminEvent) => void }) {
  const { session } = useAuth()
  const countriesQuery = useQuery({ queryKey: ['qk-admin-platform-countries'], queryFn: () => listCountries(session!.token), enabled: Boolean(session?.token) })
  const venuesQuery = useQuery({ queryKey: venuesKey, queryFn: () => listVenueDirectory(session!.token), enabled: Boolean(session?.token) })
  const categoriesQuery = useQuery({ queryKey: ['qk-admin-event-categories'], queryFn: () => listEventCategories(session!.token), enabled: Boolean(session?.token) })
  const venues = (venuesQuery.data?.venues ?? []).filter((venue): venue is VenueDirectoryEntry => Boolean(venue?.id))
  const categories = (categoriesQuery.data?.categories ?? []).filter((category): category is EventCategory => category?.id != null)
  const countries = (countriesQuery.data?.countries ?? []).filter((country): country is SupportedCountry => Boolean(country?.code))
  const [orgId, setOrgId] = useState(event?.orgId || '')
  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [logoUrl, setLogoUrl] = useState(event?.logoUrl || '')
  const [heroImageUrl, setHeroImageUrl] = useState(event?.heroImageUrl || '')
  const [accentColor, setAccentColor] = useState(event?.accentColor || '')
  const [promoTagline, setPromoTagline] = useState(event?.promoTagline || '')
  const [donationsEnabled, setDonationsEnabled] = useState(event?.donationsEnabled ?? false)
  const [donationsMinMinor, setDonationsMinMinor] = useState(event?.donationsMinMinor == null ? '' : String(event.donationsMinMinor))
  const [donationsSuggestedMinor, setDonationsSuggestedMinor] = useState(event?.donationsSuggestedMinor == null ? '' : String(event.donationsSuggestedMinor))
  const [donationsMessage, setDonationsMessage] = useState(event?.donationsMessage || '')
  const [recurring, setRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'>('weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState('1')
  const [recurrenceCount, setRecurrenceCount] = useState('4')
  const [recurrenceRule, setRecurrenceRule] = useState('FREQ=WEEKLY;INTERVAL=1;COUNT=4')
  const [variantRule, setVariantRule] = useState<'manual' | 'publish_N_days_before' | 'publish_on_sellout'>('manual')
  const [publishLeadDays, setPublishLeadDays] = useState('')
  const [ticketTemplates, setTicketTemplates] = useState<Array<{ name: string; priceMinor: string; total: string; admissionsPerUnit: string }>>([])
  const [visibility, setVisibility] = useState<'public' | 'private'>(event?.visibility === 'private' ? 'private' : 'public')
  const [currency, setCurrency] = useState((event?.currency || 'GHS').toUpperCase())
  const [venueId, setVenueId] = useState(event?.venueId || '')
  const start = eventDateParts(event?.startsAt)
  const end = eventDateParts(event?.endsAt)
  const [startsOn, setStartsOn] = useState<string | null>(start.date)
  const [startsTime, setStartsTime] = useState(start.time)
  const [endsOn, setEndsOn] = useState<string | null>(end.date)
  const [endsTime, setEndsTime] = useState(end.time)
  const [timezone, setTimezone] = useState(event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [attendanceType, setAttendanceType] = useState(event?.attendanceType || 'in_person')
  const [countryCode, setCountryCode] = useState(event?.countryCode || '')
  const [subdivisionCode, setSubdivisionCode] = useState(event?.subdivisionCode || '')
  const [tags, setTags] = useState((event?.tags ?? []).filter((tag): tag is string => Boolean(tag)).join(', '))
  const [categoryId, setCategoryId] = useState(event?.categoryId ? String(event.categoryId) : '')
  const configuredCountries = countries.filter((country) => country.enabled || country.code === countryCode)
  const countryOptions = configuredCountries.map((country) => ({ value: country.code, label: `${country.name || country.code} (${country.code})`, searchText: country.code }))
  const venueOptions = venues.map((venue) => ({
    value: venue.id,
    label: `${venue.name || 'Unnamed venue'}${[venue.city, venue.country].filter(Boolean).length ? ` · ${[venue.city, venue.country].filter(Boolean).join(', ')}` : ''}`,
    searchText: `${venue.address || ''} ${venue.country || ''} ${venue.id}`,
  }))
  const currencyOptions = getCurrencyOptions(currency)
  const categoryOptions = categories.filter((category) => category.active || String(category.id) === categoryId).map((category) => ({ value: String(category.id), label: category.name, searchText: `${category.slug} ${category.description || ''}` }))
  const [slug, setSlug] = useState(event?.customSlug || '')
  const [activeTab, setActiveTab] = useState('details')
  const [validationMessage, setValidationMessage] = useState('')
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (input: AdminEventInput | AdminRecurringEventsInput) => {
      if (event) return updateAdminEvent(session!.token, event.id, input as AdminEventInput)
      if (recurring) {
        const result = await createAdminRecurringEvents(session!.token, orgId, input as AdminRecurringEventsInput)
        const firstEvent = result.events?.find((row): row is AdminEvent => Boolean(row?.id))
        if (!firstEvent) throw new Error('The recurring event request succeeded but returned no events.')
        return firstEvent
      }
      return createAdminEvent(session!.token, orgId, input as AdminEventInput)
    },
    onSuccess: async (saved) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: eventsKey }), queryClient.invalidateQueries({ queryKey: eventKey(saved.id) })])
      toast.success(event ? 'Event updated' : recurring ? 'Recurring event series created' : 'Draft event created', { description: saved.title || title.trim() })
      onSaved(saved)
    },
    onError: (error) => toast.error(event ? 'Could not update event' : 'Could not create event', { description: error.message }),
  })
  function submit(e: FormEvent) {
    e.preventDefault()
    const startsAt = toUnixSeconds(startsOn, startsTime)
    const endsAt = toUnixSeconds(endsOn, endsTime)
    if (!event && !orgId) { setActiveTab('details'); setValidationMessage('Select an organization before creating the event.'); return }
    if (recurring && (!Number.isInteger(Number(recurrenceInterval)) || Number(recurrenceInterval) < 1 || !Number.isInteger(Number(recurrenceCount)) || Number(recurrenceCount) < 1 || Number(recurrenceCount) > 52)) { setActiveTab('recurrence'); setValidationMessage('Set an interval of at least 1 and between 1 and 52 occurrences.'); return }
    if (recurring && recurrencePattern === 'custom' && !recurrenceRule.trim()) { setActiveTab('recurrence'); setValidationMessage('Enter a recurrence rule for the custom schedule.'); return }
    if (recurring && variantRule === 'publish_N_days_before' && (!Number.isInteger(Number(publishLeadDays)) || Number(publishLeadDays) < 0)) { setActiveTab('recurrence'); setValidationMessage('Enter how many days before each occurrence it should be published.'); return }
    if (recurring && ticketTemplates.some((ticket) => !ticket.name.trim() || ticket.priceMinor === '' || ticket.total === '' || !Number.isInteger(Number(ticket.priceMinor)) || Number(ticket.priceMinor) < 0 || !Number.isInteger(Number(ticket.total)) || Number(ticket.total) < 1)) { setActiveTab('recurrence'); setValidationMessage('Each ticket template needs a name, valid price, and quantity greater than zero.'); return }
    if ([donationsMinMinor, donationsSuggestedMinor].some((value) => value !== '' && (!Number.isSafeInteger(Number(value)) || Number(value) < 0))) { setActiveTab('settings'); setValidationMessage('Donation amounts must be non-negative whole minor units.'); return }
    if (!title.trim()) { setActiveTab('details'); setValidationMessage('Enter an event title.'); return }
    if (startsAt === null || endsAt === null) { setActiveTab('schedule'); setValidationMessage('Choose valid start and end dates and times.'); return }
    if (endsAt <= startsAt) { setActiveTab('schedule'); setValidationMessage('The event end must be after its start.'); return }
    setValidationMessage('')
    const common = {
      title: title.trim(), startsAt, endsAt,
      ...(currency.trim() ? { currency: currency.trim().toUpperCase() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
      ...(heroImageUrl.trim() ? { heroImageUrl: heroImageUrl.trim() } : {}),
      ...(accentColor.trim() ? { accentColor: accentColor.trim() } : {}),
      ...(promoTagline.trim() ? { promoTagline: promoTagline.trim() } : {}),
      donationsEnabled,
      ...(donationsMinMinor !== '' ? { donationsMinMinor: Number(donationsMinMinor) } : {}),
      ...(donationsSuggestedMinor !== '' ? { donationsSuggestedMinor: Number(donationsSuggestedMinor) } : {}),
      ...(donationsMessage.trim() ? { donationsMessage: donationsMessage.trim() } : {}),
      ...(venueId.trim() ? { venueId: venueId.trim() } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(attendanceType ? { attendanceType } : {}),
      ...(countryCode.trim() ? { countryCode: countryCode.trim().toUpperCase() } : {}),
      ...(subdivisionCode.trim() ? { subdivisionCode: subdivisionCode.trim().toUpperCase() } : {}),
      ...(timezone.trim() ? { timezone: timezone.trim() } : {}),
      ...(tags.trim() ? { tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) } : {}),
    }
    if (recurring && !event) {
      mutation.mutate({
        ...common,
        recurrence: recurrencePattern === 'custom'
          ? { pattern: 'custom', rule: recurrenceRule.trim() }
          : { pattern: recurrencePattern, interval: Number(recurrenceInterval), count: Number(recurrenceCount) },
        variantRule,
        ...(variantRule === 'publish_N_days_before' ? { publishLeadDays: Number(publishLeadDays) } : {}),
        ...(ticketTemplates.length ? { ticketTemplates: ticketTemplates.map((ticket) => ({ name: ticket.name.trim(), priceMinor: Number(ticket.priceMinor), total: Number(ticket.total), admissionsPerUnit: ticket.admissionsPerUnit ? Number(ticket.admissionsPerUnit) : 1 })) } : {}),
      })
    } else {
      mutation.mutate({ ...common, ...(visibility ? { visibility } : {}), ...(slug.trim() ? { customSlug: slug.trim() } : {}) })
    }
  }
  function resetForm() {
    setOrgId(event?.orgId || '')
    setTitle(event?.title || '')
    setDescription(event?.description || '')
    setLogoUrl(event?.logoUrl || '')
    setHeroImageUrl(event?.heroImageUrl || '')
    setAccentColor(event?.accentColor || '')
    setPromoTagline(event?.promoTagline || '')
    setDonationsEnabled(event?.donationsEnabled ?? false)
    setDonationsMinMinor(event?.donationsMinMinor == null ? '' : String(event.donationsMinMinor))
    setDonationsSuggestedMinor(event?.donationsSuggestedMinor == null ? '' : String(event.donationsSuggestedMinor))
    setDonationsMessage(event?.donationsMessage || '')
    setRecurring(false)
    setRecurrencePattern('weekly')
    setRecurrenceInterval('1')
    setRecurrenceCount('4')
    setRecurrenceRule('FREQ=WEEKLY;INTERVAL=1;COUNT=4')
    setVariantRule('manual')
    setPublishLeadDays('')
    setTicketTemplates([])
    setVisibility(event?.visibility === 'private' ? 'private' : 'public')
    setCurrency((event?.currency || 'GHS').toUpperCase())
    setVenueId(event?.venueId || '')
    setStartsOn(start.date)
    setStartsTime(start.time)
    setEndsOn(end.date)
    setEndsTime(end.time)
    setTimezone(event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    setAttendanceType(event?.attendanceType || 'in_person')
    setCountryCode(event?.countryCode || '')
    setSubdivisionCode(event?.subdivisionCode || '')
    setTags((event?.tags ?? []).filter((tag): tag is string => Boolean(tag)).join(', '))
    setCategoryId(event?.categoryId ? String(event.categoryId) : '')
    setSlug(event?.customSlug || '')
    setActiveTab('details')
    setValidationMessage('')
    mutation.reset()
    setResetConfirmOpen(false)
  }
  const startsAt = toUnixSeconds(startsOn, startsTime)
  const endsAt = toUnixSeconds(endsOn, endsTime)
  return <form id="admin-event-form" className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))} className="mt-4 min-h-0 flex-1 gap-5 px-6">
      <TabsList aria-label="Event form sections" className="!h-auto !rounded-xl w-full grid grid-cols-2 gap-1 sm:grid-cols-5">
        <TabsTrigger className="!h-auto !rounded-md min-h-9 whitespace-normal text-center" value="details">Event</TabsTrigger><TabsTrigger className="!h-auto !rounded-md min-h-9 whitespace-normal text-center" value="schedule">Schedule</TabsTrigger>{!event && recurring && <TabsTrigger className="!h-auto !rounded-md min-h-9 whitespace-normal text-center" value="recurrence">Recurrence</TabsTrigger>}<TabsTrigger className="!h-auto !rounded-md min-h-9 whitespace-normal text-center" value="location">Location</TabsTrigger><TabsTrigger className="!h-auto !rounded-md min-h-9 whitespace-normal text-center" value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="event-form-tab-panel space-y-4 pb-6">
        {!event && <label className="block space-y-2.5 text-sm font-medium">Organization<select value={orgId} onChange={(e) => setOrgId(e.target.value)} required disabled={!organizations.length} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">{organizations.length ? 'Select an organization' : 'No organizations available'}</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name || 'Unnamed organization'}{org.status ? ` · ${org.status}` : ''}</option>)}</select></label>}
        <label className="block space-y-2.5 text-sm font-medium">Event title<Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={180} /></label>
        <label className="block space-y-2.5 text-sm font-medium">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
        {!event && <label className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm font-medium"><input type="checkbox" checked={recurring} onChange={(e) => { setRecurring(e.target.checked); if (!e.target.checked && activeTab === 'recurrence') setActiveTab('details') }} className="size-4 accent-brand" />Create a recurring event series</label>}
      </TabsContent>
      {!event && recurring && <TabsContent value="recurrence" className="event-form-tab-panel space-y-4 pb-6">
        <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2.5 text-sm font-medium">Schedule pattern<select value={recurrencePattern} onChange={(e) => setRecurrencePattern(e.target.value as typeof recurrencePattern)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="custom">Custom (RFC 5545 rule)</option></select></label>
        <label className="block space-y-2.5 text-sm font-medium">Occurrence publishing<select value={variantRule} onChange={(e) => setVariantRule(e.target.value as typeof variantRule)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="manual">Publish manually</option><option value="publish_N_days_before">Publish a set number of days before</option><option value="publish_on_sellout">Publish when the previous occurrence sells out</option></select></label></div>
        {recurrencePattern === 'custom' ? <label className="block space-y-2.5 text-sm font-medium">Recurrence rule<Input value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} placeholder="FREQ=WEEKLY;INTERVAL=1;COUNT=4" /><span className="text-xs font-normal text-ink-muted">Supported parts: FREQ, INTERVAL, BYDAY, BYMONTHDAY, BYMONTH, COUNT, UNTIL.</span></label> : <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2.5 text-sm font-medium">Repeat every<Input type="number" min="1" step="1" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value)} /></label><label className="block space-y-2.5 text-sm font-medium">Number of occurrences<Input type="number" min="1" max="52" step="1" value={recurrenceCount} onChange={(e) => setRecurrenceCount(e.target.value)} /></label></div>}
        {variantRule === 'publish_N_days_before' && <label className="block space-y-2.5 text-sm font-medium">Publish lead days<Input type="number" min="0" step="1" value={publishLeadDays} onChange={(e) => setPublishLeadDays(e.target.value)} /></label>}
        <div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="text-sm font-medium">Ticket templates</h3><p className="text-xs text-ink-muted">Optionally apply the same ticket setup to each occurrence.</p></div><Button type="button" variant="outline" onClick={() => setTicketTemplates((rows) => [...rows, { name: '', priceMinor: '', total: '', admissionsPerUnit: '1' }])}>Add ticket template</Button></div>{ticketTemplates.map((ticket, index) => <div key={index} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-4"><label className="space-y-2 text-xs font-medium">Name<Input value={ticket.name} onChange={(e) => setTicketTemplates((rows) => rows.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} /></label><label className="space-y-2 text-xs font-medium">Price (minor units)<Input type="number" min="0" step="1" value={ticket.priceMinor} onChange={(e) => setTicketTemplates((rows) => rows.map((row, i) => i === index ? { ...row, priceMinor: e.target.value } : row))} /></label><label className="space-y-2 text-xs font-medium">Quantity<Input type="number" min="1" step="1" value={ticket.total} onChange={(e) => setTicketTemplates((rows) => rows.map((row, i) => i === index ? { ...row, total: e.target.value } : row))} /></label><div className="flex items-end justify-between gap-2"><label className="space-y-2 text-xs font-medium">Admissions / unit<Input type="number" min="1" step="1" value={ticket.admissionsPerUnit} onChange={(e) => setTicketTemplates((rows) => rows.map((row, i) => i === index ? { ...row, admissionsPerUnit: e.target.value } : row))} /></label><Button type="button" variant="ghost" aria-label={`Remove ticket template ${index + 1}`} onClick={() => setTicketTemplates((rows) => rows.filter((_, i) => i !== index))}>Remove</Button></div></div>)}</div>
      </TabsContent>}
      <TabsContent value="schedule" className="event-form-tab-panel space-y-4 pb-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><label className="block space-y-2.5 text-sm font-medium">Starts on<div><AppDatePicker className="w-full" value={startsOn} onValueChange={setStartsOn} /></div></label><label className="block space-y-2.5 text-sm font-medium">Start time<input type="time" value={startsTime} onChange={(e) => setStartsTime(e.target.value)} required className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label></div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><label className="block space-y-2.5 text-sm font-medium">Ends on<div><AppDatePicker className="w-full" value={endsOn} onValueChange={setEndsOn} /></div></label><label className="block space-y-2.5 text-sm font-medium">End time<input type="time" value={endsTime} onChange={(e) => setEndsTime(e.target.value)} required className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label></div>
        {startsOn && <p className="text-xs text-ink-muted">Starts {formatDate(startsOn)}{startsTime ? ` at ${startsTime}` : ''}; saved in the selected timezone.</p>}
      </TabsContent>
      <TabsContent value="location" className="event-form-tab-panel space-y-4 pb-6">
        <label className="block space-y-2.5 text-sm font-medium">Attendance<select value={attendanceType} onChange={(e) => setAttendanceType(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="in_person">In person</option><option value="virtual">Virtual</option><option value="hybrid">Hybrid</option></select></label>
        <SearchableOptionField label="Venue (optional)" value={venueId} onChange={setVenueId} options={venueOptions} emptyOption={{ value: '', label: 'No venue selected' }} placeholder="Select a venue" searchPlaceholder="Search venues…" emptyMessage="No venues match your search." loading={venuesQuery.isLoading} error={venuesQuery.isError ? venuesQuery.error.message : undefined} />
        <div className="grid gap-4 sm:grid-cols-2"><SearchableOptionField label="Country" value={countryCode} onChange={setCountryCode} options={countryOptions} emptyOption={{ value: '', label: 'No country selected' }} placeholder="Select a country" searchPlaceholder="Search configured countries…" emptyMessage="No countries match your search." loading={countriesQuery.isLoading} error={countriesQuery.isError ? countriesQuery.error.message : undefined} /><label className="block space-y-2.5 text-sm font-medium">Subdivision code<Input value={subdivisionCode} onChange={(e) => setSubdivisionCode(e.target.value.toUpperCase())} placeholder="GH-AA" /></label></div>
      </TabsContent>
      <TabsContent value="settings" className="event-form-tab-panel space-y-4 pb-6">
        <div className="grid gap-4 sm:grid-cols-2">{!recurring && <label className="block space-y-2.5 text-sm font-medium">Visibility<select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="public">Public</option><option value="private">Private</option></select></label>}<SearchableOptionField label="Currency" value={currency} onChange={setCurrency} options={currencyOptions} placeholder="Select a currency" searchPlaceholder="Search currencies…" emptyMessage="No currencies match your search." emptyOption={{ value: '', label: 'No currency selected' }} /></div>
        <label className="block space-y-2.5 text-sm font-medium">Timezone<Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Africa/Accra" /></label>
        <SearchableOptionField label="Category" value={categoryId} onChange={setCategoryId} options={categoryOptions} emptyOption={{ value: '', label: 'No category selected' }} placeholder="Select a category" searchPlaceholder="Search categories…" emptyMessage="No categories match your search." loading={categoriesQuery.isLoading} error={categoriesQuery.isError ? categoriesQuery.error.message : undefined} />
        <label className="block space-y-2.5 text-sm font-medium">Tags <span className="font-normal text-ink-muted">(comma separated)</span><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="music, festival" /></label>
        <label className="block space-y-2.5 text-sm font-medium">Custom slug <span className="font-normal text-ink-muted">(optional)</span><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
        <div className="space-y-4 border-t border-line pt-4">
          <h3 className="text-sm font-semibold">Branding</h3>
          <label className="block space-y-2.5 text-sm font-medium">Logo URL<Input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" /></label>
          <label className="block space-y-2.5 text-sm font-medium">Hero image URL<Input type="url" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} placeholder="https://…" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2.5 text-sm font-medium">Accent color<Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#2563EB" maxLength={7} /></label><label className="block space-y-2.5 text-sm font-medium">Promo tagline<Input value={promoTagline} onChange={(e) => setPromoTagline(e.target.value)} maxLength={200} /></label></div>
        </div>
        <div className="space-y-4 border-t border-line pt-4">
          <h3 className="text-sm font-semibold">Donations</h3>
          <label className="flex items-center justify-between gap-3 text-sm font-medium">Enable donations<input type="checkbox" checked={donationsEnabled} onChange={(e) => setDonationsEnabled(e.target.checked)} className="size-4 accent-brand" /></label>
          {donationsEnabled && <><div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2.5 text-sm font-medium">Minimum donation (minor units)<Input type="number" min="0" step="1" value={donationsMinMinor} onChange={(e) => setDonationsMinMinor(e.target.value)} placeholder="Optional" /></label><label className="block space-y-2.5 text-sm font-medium">Suggested donation (minor units)<Input type="number" min="0" step="1" value={donationsSuggestedMinor} onChange={(e) => setDonationsSuggestedMinor(e.target.value)} placeholder="Optional" /></label></div><label className="block space-y-2.5 text-sm font-medium">Donation message<textarea value={donationsMessage} onChange={(e) => setDonationsMessage(e.target.value)} rows={3} maxLength={500} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label></>}
        </div>
        <p role="status" className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">Branding and donation fields are included in this form, but the current admin API does not yet save them.</p>
      </TabsContent>
    </Tabs>
    <div className="px-6">{mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}{validationMessage && <ErrorMessage>{validationMessage}</ErrorMessage>}{startsAt !== null && endsAt !== null && endsAt <= startsAt && <ErrorMessage>Event end must be after the start.</ErrorMessage>}</div>
    <SheetFooter className="mt-5 flex-row justify-end border-t border-line"><Button type="button" variant="outline" onClick={() => setResetConfirmOpen(true)}>Reset form</Button><Button type="submit" form="admin-event-form" disabled={mutation.isPending || !title.trim() || (!orgId && !event) || startsAt === null || endsAt === null || endsAt <= startsAt}>{mutation.isPending ? 'Saving…' : event ? 'Save changes' : 'Create draft'}</Button></SheetFooter>
    <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset event form?</DialogTitle>
          <DialogDescription>This will restore every field to its starting value and clear any validation messages.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setResetConfirmOpen(false)}>Keep editing</Button>
          <Button type="button" onClick={resetForm}>Reset form</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </form>
}

function TicketTypeEditor({ eventId, ticket, currency, onDone }: { eventId: string; ticket?: AdminTicketType | null; currency?: string | null; onDone: () => void }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [name, setName] = useState(ticket?.name || '')
  const [price, setPrice] = useState(ticket?.priceMinor === null || ticket?.priceMinor === undefined ? '' : String(ticket.priceMinor))
  const [total, setTotal] = useState(ticket?.total === null || ticket?.total === undefined ? '' : String(ticket.total))
  const saleStart = eventDateParts(ticket?.saleStartAt)
  const saleEnd = eventDateParts(ticket?.saleEndAt)
  const [saleStartsOn, setSaleStartsOn] = useState<string | null>(saleStart.date)
  const [saleStartsTime, setSaleStartsTime] = useState(saleStart.time)
  const [saleEndsOn, setSaleEndsOn] = useState<string | null>(saleEnd.date)
  const [saleEndsTime, setSaleEndsTime] = useState(saleEnd.time)
  const [ticketStatus, setTicketStatus] = useState(ticket?.status || '')
  const mutation = useMutation({
    mutationFn: () => {
      const saleStartAt = toUnixSeconds(saleStartsOn, saleStartsTime)
      const saleEndAt = toUnixSeconds(saleEndsOn, saleEndsTime)
      const input: AdminTicketTypeInput = {
        name: name.trim(), priceMinor: Number(price), total: Number(total),
        ...(saleStartAt !== null ? { saleStartAt } : {}), ...(saleEndAt !== null ? { saleEndAt } : {}),
        ...(ticketStatus ? { status: ticketStatus } : {}),
      }
      return ticket ? updateAdminTicketType(session!.token, eventId, ticket.id, input) : createAdminTicketType(session!.token, eventId, input)
    },
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ticketKey(eventId) }), client.invalidateQueries({ queryKey: eventKey(eventId) })]); toast.success(ticket ? 'Ticket type updated' : 'Ticket type added'); onDone() },
    onError: (error) => toast.error('Could not save ticket type', { description: error.message }),
  })
  return <Sheet open onOpenChange={(open) => { if (!open) onDone() }}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">
    <SheetHeader><SheetTitle>{ticket ? 'Edit ticket type' : 'Add ticket type'}</SheetTitle><SheetDescription>Set ticket inventory, price, and sales window for this event.</SheetDescription></SheetHeader>
    <form id="ticket-type-editor" className="flex-1 space-y-4 overflow-y-auto px-6 pb-6" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <label className="block space-y-1.5 text-sm font-medium">Ticket type name<Input required value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Price ({currency || 'event currency'} minor units)<Input type="number" min="0" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Quantity<Input type="number" min={Number(ticket?.sold ?? 0)} step="1" required value={total} onChange={(e) => setTotal(e.target.value)} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Sales start date<div><AppDatePicker value={saleStartsOn} onValueChange={setSaleStartsOn} placeholder="No start limit" /></div></label>
      <label className="block space-y-1.5 text-sm font-medium">Sales start time <span className="font-normal text-ink-muted">(optional)</span><input type="time" value={saleStartsTime} onChange={(e) => setSaleStartsTime(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
      <label className="block space-y-1.5 text-sm font-medium">Sales end date<div><AppDatePicker value={saleEndsOn} onValueChange={setSaleEndsOn} placeholder="No end limit" /></div></label>
      <label className="block space-y-1.5 text-sm font-medium">Sales end time <span className="font-normal text-ink-muted">(optional)</span><input type="time" value={saleEndsTime} onChange={(e) => setSaleEndsTime(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand" /></label>
      {ticket && <label className="block space-y-1.5 text-sm font-medium">Status<Input value={ticketStatus} onChange={(e) => setTicketStatus(e.target.value)} placeholder="Enter API status" /></label>}
      {mutation.isError && <ErrorMessage>{mutation.error.message}</ErrorMessage>}
    </form>
    <SheetFooter className="border-t border-line"><Button variant="outline" onClick={onDone}>Cancel</Button><Button type="submit" form="ticket-type-editor" disabled={mutation.isPending || !name.trim() || !price || !total}>{mutation.isPending ? 'Saving…' : ticket ? 'Save ticket type' : 'Add ticket type'}</Button></SheetFooter>
  </SheetContent></Sheet>
}

export function AdminEventDetailsPage({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [ticketEditor, setTicketEditor] = useState<AdminTicketType | null | undefined>(undefined)
  const [ticketPage, setTicketPage] = useState(0)
  const [ticketPageSize, setTicketPageSize] = useState(10)
  const [ordersPage, setOrdersPage] = useState(0)
  const [orderPageSize, setOrderPageSize] = useState(25)
  const detailsQuery = useQuery({ queryKey: eventKey(eventId), queryFn: () => getAdminEvent(session!.token, eventId), enabled: Boolean(session?.token) })
  const ticketsQuery = useQuery({ queryKey: ticketKey(eventId), queryFn: () => listAdminTicketTypes(session!.token, eventId), enabled: Boolean(session?.token) })
  const ordersQuery = useQuery({ queryKey: ordersKey(eventId, ordersPage * orderPageSize), queryFn: () => listAdminEventOrders(session!.token, eventId, orderPageSize, ordersPage * orderPageSize), enabled: Boolean(session?.token && activeSection === 'orders') })
  const publish = useMutation({ mutationFn: () => publishAdminEvent(session!.token, eventId), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: eventsKey }), client.invalidateQueries({ queryKey: eventKey(eventId) })]); toast.success('Event published') }, onError: (error) => toast.error('Could not publish event', { description: error.message }) })
  const removeTicket = useMutation({ mutationFn: (id: string) => deleteAdminTicketType(session!.token, eventId, id), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ticketKey(eventId) }), client.invalidateQueries({ queryKey: eventKey(eventId) })]); toast.success('Ticket type deleted') }, onError: (error) => toast.error('Could not delete ticket type', { description: error.message }) })
  const event = detailsQuery.data?.event
  const tickets = ticketsQuery.data?.ticketTypes ?? (Array.isArray(detailsQuery.data?.ticketTypes) ? detailsQuery.data.ticketTypes.filter((ticket): ticket is AdminTicketType => Boolean(ticket?.id)) : [])
  const ticketPageCount = Math.max(1, Math.ceil(tickets.length / ticketPageSize))
  const visibleTickets = tickets.slice(ticketPage * ticketPageSize, (ticketPage + 1) * ticketPageSize)
  const orders = ordersQuery.data?.orders ?? []
  const venueQuery = useQuery({ queryKey: ['qk-admin-venue', event?.venueId], queryFn: () => getAdminVenue(session!.token, event!.venueId!), enabled: Boolean(session?.token && event?.venueId) })
  return <section className="space-y-6">
    <div><Button variant="ghost" className="mb-2 px-0" onClick={() => navigate({ to: '/app/events' as never })}>← Events</Button><h1 className="text-xl font-semibold tracking-tight">{event?.title || 'Event details'}</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Manage event information, tickets, orders, and publishing.</p></div>
    {detailsQuery.isLoading ? <p className="py-8 text-center text-sm text-ink-muted">Loading event…</p> : detailsQuery.isError ? <ErrorMessage>{detailsQuery.error.message}</ErrorMessage> : event ? <div className="space-y-6">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-5 pt-6"><div className="flex flex-wrap items-center gap-x-6 gap-y-3"><div className="flex items-center gap-3">{statusBadge(event.status)}<span className="text-sm text-ink-muted">Organization {event.orgId || 'unavailable'}</span></div><div><p className="text-xs text-ink-muted">Starts</p><p className="mt-1 text-sm font-medium">{displayDateTime(event.startsAt, event.timezone)}</p></div><div><p className="text-xs text-ink-muted">Ends</p><p className="mt-1 text-sm font-medium">{displayDateTime(event.endsAt, event.timezone)}</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setEditing((value) => !value); setTicketEditor(undefined) }}>{editing ? 'Close editor' : 'Edit event'}</Button>{event.status === 'draft' && <Button disabled={publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? 'Publishing…' : 'Publish event'}</Button>}</div></CardContent></Card>
      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(String(value))}>
        <TabsList variant="line" aria-label="Event management sections" className="w-full justify-start overflow-x-auto"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="tickets">Ticket types</TabsTrigger><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="venue">Venue</TabsTrigger><TabsTrigger value="coupons">Coupons</TabsTrigger><TabsTrigger value="fees">Fee overrides</TabsTrigger><TabsTrigger value="channels">Publish channels</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-5">
          {editing ? <Sheet open onOpenChange={(open) => { if (!open) setEditing(false) }}><SheetContent className="w-full overflow-y-auto sm:max-w-4xl"><SheetHeader><SheetTitle>Edit event</SheetTitle><SheetDescription>Update the event details and schedule.</SheetDescription></SheetHeader><EventForm event={event} organizations={[]} onSaved={() => setEditing(false)} /></SheetContent></Sheet> : <Card><CardContent className="pt-6"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-xs text-ink-muted">Starts</dt><dd className="mt-1 text-sm">{displayDateTime(event.startsAt, event.timezone)}</dd></div><div><dt className="text-xs text-ink-muted">Ends</dt><dd className="mt-1 text-sm">{displayDateTime(event.endsAt, event.timezone)}</dd></div><div><dt className="text-xs text-ink-muted">Venue</dt><dd className="mt-1 text-sm">{venueQuery.data?.name || event.venueId || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Attendance</dt><dd className="mt-1 text-sm">{event.attendanceType || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Currency</dt><dd className="mt-1 text-sm">{event.currency || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Visibility</dt><dd className="mt-1 text-sm">{event.visibility || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Category</dt><dd className="mt-1 text-sm">{event.categoryId ?? 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Country</dt><dd className="mt-1 text-sm">{event.countryCode || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Slug</dt><dd className="mt-1 break-all text-sm">{event.customSlug || 'Not provided'}</dd></div></dl>{event.description && <p className="mt-5 whitespace-pre-wrap border-t border-line pt-4 text-sm leading-6 text-ink-muted">{event.description}</p>}</CardContent></Card>}
        </TabsContent>
        <TabsContent value="tickets" className="space-y-4">
      <Card className="gap-0 py-0"><CardContent className="p-0">{ticketEditor === undefined && <div className="flex justify-end p-4"><Button onClick={() => setTicketEditor(null)}>Add ticket type</Button></div>}<DataTable data={visibleTickets} headers={['Ticket type', { label: 'Price', className: 'text-right' }, { label: 'Sold / total', className: 'text-right' }, 'Status', { label: 'Actions', className: 'text-right' }]} label="Event ticket types" loading={ticketsQuery.isLoading} loadingMessage="Loading ticket types…" error={ticketsQuery.isError ? ticketsQuery.error.message : null} emptyMessage="No ticket types yet. Add a ticket type before publishing." pagination={{ pageIndex: ticketPage, pageSize: ticketPageSize, totalItems: tickets.length, onPageChange: (next) => setTicketPage(Math.min(next, ticketPageCount - 1)), onPageSizeChange: (size) => { setTicketPageSize(size); setTicketPage(0) } }} renderRow={(ticket) => <TableRow key={ticket.id}><TableCell><span className="font-medium">{ticket.name || 'Unnamed ticket type'}</span><span className="mt-0.5 block text-xs text-ink-muted">{ticket.id}</span></TableCell><TableCell className="text-right tabular-nums">{formatMinor(ticket.priceMinor, event.currency)}</TableCell><TableCell className="text-right tabular-nums">{ticket.sold ?? 0} / {ticket.total ?? '—'}</TableCell><TableCell>{ticket.status || 'Unknown'}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`Edit ${ticket.name || 'ticket type'}`} icon={<span aria-hidden="true">✎</span>} onClick={() => setTicketEditor(ticket)} /><AppIconAction label={`Delete ${ticket.name || 'ticket type'}`} icon={<span aria-hidden="true">×</span>} disabled={removeTicket.isPending || Number(ticket.sold ?? 0) > 0} onClick={() => { if (window.confirm('Delete this unsold ticket type?')) removeTicket.mutate(ticket.id) }} /></div></TableCell></TableRow>} containerClassName="" />{removeTicket.isError && <div className="px-5 py-3"><ErrorMessage>{removeTicket.error.message}</ErrorMessage></div>}</CardContent></Card>
      {ticketEditor !== undefined && <TicketTypeEditor key={ticketEditor?.id || 'new-ticket'} eventId={event.id} ticket={ticketEditor} currency={event.currency} onDone={() => { setTicketEditor(undefined); setTicketPage(0) }} />}
        </TabsContent>
        <TabsContent value="orders"><Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={orders} headers={['Order', 'Buyer contact', 'Status', { label: 'Total', className: 'text-right' }]} label="Event orders" loading={ordersQuery.isLoading} loadingMessage="Loading orders…" error={ordersQuery.isError ? ordersQuery.error.message : null} emptyMessage="No orders for this event yet." pagination={{ pageIndex: ordersPage, pageSize: orderPageSize, totalItems: ordersQuery.data?.total ?? 0, onPageChange: setOrdersPage, onPageSizeChange: (size) => { setOrderPageSize(size); setOrdersPage(0) } }} renderRow={(order) => <OrderRow key={order.id} order={order} />} containerClassName="" /></CardContent></Card></TabsContent>
        <TabsContent value="venue"><Card><CardContent className="pt-6">{venueQuery.isLoading ? <p className="text-sm text-ink-muted">Loading venue…</p> : venueQuery.isError ? <ErrorMessage>{venueQuery.error.message}</ErrorMessage> : venueQuery.data ? <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-ink-muted">Venue</dt><dd className="mt-1 text-sm">{venueQuery.data.name || 'Unnamed venue'}</dd></div><div><dt className="text-xs text-ink-muted">Status</dt><dd className="mt-1 text-sm">{venueQuery.data.status || 'Unknown'}</dd></div><div><dt className="text-xs text-ink-muted">Address</dt><dd className="mt-1 text-sm">{venueQuery.data.address || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">City / country</dt><dd className="mt-1 text-sm">{[venueQuery.data.city, venueQuery.data.country].filter(Boolean).join(', ') || 'Not provided'}</dd></div><div><dt className="text-xs text-ink-muted">Capacity</dt><dd className="mt-1 text-sm">{venueQuery.data.capacity ?? 'Not provided'}</dd></div></dl> : <p className="text-sm text-ink-muted">No venue is assigned to this event.</p>}</CardContent></Card></TabsContent>
        {(['coupons', 'fees', 'channels'] as const).map((section) => <TabsContent key={section} value={section}><Card><CardContent className="pt-6"><p className="font-medium">{section === 'coupons' ? 'Event coupons' : section === 'fees' ? 'Event fee overrides' : 'Event publishing channels'}</p><p className="mt-1 text-sm text-ink-muted">The admin API does not currently provide event-specific {section === 'coupons' ? 'coupon' : section === 'fees' ? 'fee override' : 'channel assignment'} endpoints, so this section cannot be managed yet.</p></CardContent></Card></TabsContent>)}
      </Tabs>
    </div> : <p className="py-8 text-center text-sm text-ink-muted">No event details were returned.</p>}
  </section>
}

function OrderRow({ order }: { order: AdminOrder }) {
  const created = order.createdAt ? displayDateTime(order.createdAt) : 'Date unavailable'
  const buyer = order.contactEmail || order.contactPhone || order.userId || 'Buyer details unavailable'
  return <TableRow><TableCell><span className="block font-medium">{order.id}</span><span className="mt-0.5 block text-xs text-ink-muted">{created}</span></TableCell><TableCell className="break-all">{buyer}</TableCell><TableCell>{statusBadge(order.status)}</TableCell><TableCell className="text-right tabular-nums">{formatMinor(order.total, order.currency)}</TableCell></TableRow>
}

export function AdminEventsPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [status, setStatus] = useState<EventStatusFilter>('')
  const [orgId, setOrgId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [eventPageSize, setEventPageSize] = useState(10)
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null)
  const orgsQuery = useQuery({ queryKey: orgsKey, queryFn: () => listAdminOrganizations(session!.token), enabled: Boolean(session?.token) })
  const venuesQuery = useQuery({ queryKey: venuesKey, queryFn: () => listVenueDirectory(session!.token), enabled: Boolean(session?.token) })
  const categoriesQuery = useQuery({ queryKey: ['qk-admin-event-categories'], queryFn: () => listEventCategories(session!.token), enabled: Boolean(session?.token) })
  const publish = useMutation({ mutationFn: (id: string) => publishAdminEvent(session!.token, id), onSuccess: async (_result, id) => { await Promise.all([client.invalidateQueries({ queryKey: eventsKey }), client.invalidateQueries({ queryKey: eventKey(id) })]); toast.success('Event published') }, onError: (error) => toast.error('Could not publish event', { description: error.message }) })
  const eventsQuery = useQuery({ queryKey: [...eventsKey, 'list', orgId, status], queryFn: () => listAdminEvents(session!.token, { ...(orgId ? { orgId } : {}), ...(status ? { status } : {}) }), enabled: Boolean(session?.token) })
  const events = eventsQuery.data?.events ?? []
  const filtered = useMemo(() => events.filter((event) => `${event.title ?? ''} ${event.id} ${event.orgId ?? ''} ${event.venueId ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [events, search])
  const pageCount = Math.max(1, Math.ceil(filtered.length / eventPageSize))
  const visible = filtered.slice(page * eventPageSize, (page + 1) * eventPageSize)
  const organizations = (orgsQuery.data?.organizations ?? []).filter((org) => org.type !== 'vendor')
  const venues = venuesQuery.data?.venues ?? []
  const categories = categoriesQuery.data?.categories ?? []
  return <section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-semibold tracking-tight">Events</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Browse events across organizations, review their status, and manage setup.</p></div><Button onClick={() => navigate({ to: '/app/events/create' as never })}>Create event</Button></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><FilterTabs label="Filter events by status" value={status} onValueChange={(value) => { setStatus(value as EventStatusFilter); setPage(0) }} options={[{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'completed', label: 'Completed' }]} /><div className="flex flex-wrap gap-3"><Input aria-label="Search events" placeholder="Search events or organizations" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} className="sm:w-64" /><label className="sr-only" htmlFor="event-org-filter">Filter events by organization</label><select id="event-org-filter" value={orgId} onChange={(e) => { setOrgId(e.target.value); setPage(0) }} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand"><option value="">All organizations</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name || org.id}</option>)}</select></div></div>
    {orgsQuery.isError && <ErrorMessage>{orgsQuery.error.message}</ErrorMessage>}
    <Card className="gap-0 py-0"><CardContent className="p-0"><DataTable data={visible} headers={['Event', 'Organization', 'Venue', 'Category', 'Starts', 'Status', { label: 'Actions', className: 'text-right' }]} label="Admin events" loading={eventsQuery.isLoading} loadingMessage="Loading events…" error={eventsQuery.isError ? eventsQuery.error.message : null} emptyMessage={search ? `No events match “${search}”.` : <div><p className="text-sm font-medium">No events found</p><p className="mt-1 text-sm text-ink-muted">Create an event or adjust the organization and status filters.</p></div>} emptyClassName="h-32 text-center" pagination={{ pageIndex: page, pageSize: eventPageSize, totalItems: filtered.length, onPageChange: (next) => setPage(Math.min(next, pageCount - 1)), onPageSizeChange: (size) => { setEventPageSize(size); setPage(0) } }} renderRow={(event) => <TableRow key={event.id}><TableCell><span className="block font-medium">{event.title || 'Untitled event'}</span><span className="mt-0.5 block text-xs text-ink-muted">{event.id}</span></TableCell><TableCell>{organizations.find((org) => org.id === event.orgId)?.name || event.orgId || 'Organization unavailable'}</TableCell><TableCell>{venues.find((venue) => venue.id === event.venueId)?.name || '—'}</TableCell><TableCell>{categories.find((category) => category.id === event.categoryId)?.name || '—'}</TableCell><TableCell>{displayDateTime(event.startsAt, event.timezone)}</TableCell><TableCell>{statusBadge(event.status)}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><AppIconAction label={`View ${event.title || 'event'}`} icon={<span aria-hidden="true">↗</span>} onClick={() => navigate({ to: '/app/events/$eventId', params: { eventId: event.id } })} /><AppIconAction label={`Edit ${event.title || 'event'}`} icon={<span aria-hidden="true">✎</span>} onClick={() => setEditingEvent(event)} />{event.status === 'draft' && <AppIconAction label={`Publish ${event.title || 'event'}`} icon={<span aria-hidden="true">↑</span>} disabled={publish.isPending} onClick={() => publish.mutate(event.id)} />}</div></TableCell></TableRow>} containerClassName="" />
    </CardContent></Card>
    <Sheet open={Boolean(editingEvent)} onOpenChange={(open) => { if (!open) setEditingEvent(null) }}><SheetContent className="w-full overflow-y-auto sm:max-w-4xl"><SheetHeader><SheetTitle>Edit event</SheetTitle><SheetDescription>Update this event's details and schedule.</SheetDescription></SheetHeader>{editingEvent && <EventForm event={editingEvent} organizations={organizations} onSaved={() => setEditingEvent(null)} />}</SheetContent></Sheet>
  </section>
}

export function AdminEventCreatePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const orgsQuery = useQuery({ queryKey: orgsKey, queryFn: () => listAdminOrganizations(session!.token), enabled: Boolean(session?.token) })
  const venuesQuery = useQuery({ queryKey: venuesKey, queryFn: () => listVenueDirectory(session!.token), enabled: Boolean(session?.token) })
  const categoriesQuery = useQuery({ queryKey: ['qk-admin-event-categories'], queryFn: () => listEventCategories(session!.token), enabled: Boolean(session?.token) })
  const organizations = (orgsQuery.data?.organizations ?? []).filter((organization) => organization.type !== 'vendor')
  const venues = venuesQuery.data?.venues ?? []
  const categories = categoriesQuery.data?.categories ?? []
  const backToEvents = () => navigate({ to: '/app/events' as never })
  return <section className="space-y-6">
    <div><Button variant="ghost" className="mb-2 px-0" onClick={backToEvents}>← Events</Button><h1 className="text-xl font-semibold tracking-tight">Create event</h1><p className="mt-1 max-w-2xl text-sm text-ink-muted">Set up a new event. It will start as a draft until you publish it.</p></div>
    {orgsQuery.isLoading || venuesQuery.isLoading || categoriesQuery.isLoading ? <Card><CardContent className="py-10 text-center text-sm text-ink-muted">Loading event setup options…</CardContent></Card>
      : orgsQuery.isError ? <ErrorMessage>{orgsQuery.error.message}</ErrorMessage>
        : organizations.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-ink-muted">No organizations are available to own an event.</CardContent></Card>
          : <Card className="gap-0 py-0"><CardContent className="p-0">
            {venuesQuery.isError && <p role="status" className="mx-6 mt-5 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">Venue options could not be loaded. You can still create an event without assigning a venue.</p>}
            {categoriesQuery.isError && <p role="status" className="mx-6 mt-3 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">Event categories could not be loaded. You can still create an event without a category.</p>}
            <EventForm organizations={organizations} onSaved={(event) => { void navigate({ to: '/app/events/$eventId' as never, params: { eventId: event.id } as never }) }} />
          </CardContent></Card>}
  </section>
}
