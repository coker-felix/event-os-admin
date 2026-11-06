export function PlanningError({ error }: { error: Error }) {
  const status = (error as Error & { status?: number }).status
  if (status === 412) {
    return (
      <p role="status" className="p-4 text-sm text-ink-muted">
        Event planning is not enabled for this organization.
      </p>
    )
  }
  return (
    <p role="alert" className="p-4 text-sm text-danger">
      {error.message}
    </p>
  )
}
