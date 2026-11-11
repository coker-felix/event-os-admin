import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { getAdminProfile, listReports, type CommunityReport } from '@/services/admin-community'

export function ReportSidePanel({ report, open, onOpenChange }: { report: CommunityReport | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth()
  const profileQuery = useQuery({
    queryKey: ['community-admin-profile', report?.targetPreview.authorUserId],
    queryFn: () => getAdminProfile(session!.token, report!.targetPreview.authorUserId!),
    enabled: Boolean(open && session?.token && report?.targetType === 'profile' && report.targetPreview.authorUserId),
  })
  const reportsQuery = useQuery({
    queryKey: ['community-target-reports', report?.targetType, report?.targetId],
    queryFn: async () => {
      const statuses = await Promise.all(['open', 'actioned', 'dismissed'].map((status) => listReports(session!.token, { status, limit: 100, offset: 0 })))
      return statuses.flatMap((page) => page.items).filter((item) => item.targetType === report!.targetType && item.targetId === report!.targetId)
    },
    enabled: Boolean(open && session?.token && report),
  })
  const preview = report?.targetPreview
  const profile = profileQuery.data as { profile?: Record<string, unknown> } | undefined
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>{preview?.title || 'Reported target'}</SheetTitle><SheetDescription>{report?.targetType || 'Unknown'} · {preview?.status || 'Unknown status'}</SheetDescription></SheetHeader>{report && <div className="space-y-6 px-6 pb-6">
    <section><h3 className="text-sm font-semibold">Target details</h3>{report.targetType === 'profile' ? profileQuery.isLoading ? <p role="status" className="mt-2 text-sm text-ink-muted">Loading profile…</p> : profileQuery.isError ? <p role="alert" className="mt-2 text-sm">Could not load this profile.</p> : <dl className="mt-2 space-y-2 text-sm">{Object.entries(profile?.profile ?? {}).filter(([, value]) => typeof value === 'string' && value.length > 0).map(([key, value]) => <div key={key}><dt className="text-xs capitalize text-ink-muted">{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</dt><dd>{String(value)}</dd></div>)}</dl> : <p className="mt-2 whitespace-pre-wrap text-sm">{preview?.excerpt || 'No excerpt available.'}</p>}</section>
    <section><h3 className="text-sm font-semibold">Reports on this target</h3>{reportsQuery.isLoading ? <p role="status" className="mt-2 text-sm text-ink-muted">Loading reports…</p> : reportsQuery.isError ? <p role="alert" className="mt-2 text-sm">Could not load reports for this target.</p> : (reportsQuery.data ?? []).length ? <ul className="mt-2 divide-y divide-line">{reportsQuery.data!.map((item) => <li key={item.id} className="py-3"><div className="flex items-center justify-between gap-2"><span className="text-sm">{item.reason || 'No reason supplied'}</span><Badge variant="outline">{item.status || 'unknown'}</Badge></div><p className="mt-1 text-xs text-ink-muted">{item.createdAt || 'Date unavailable'}</p></li>)}</ul> : <p className="mt-2 text-sm text-ink-muted">No reports found for this target.</p>}</section>
  </div>}</SheetContent></Sheet>
}
