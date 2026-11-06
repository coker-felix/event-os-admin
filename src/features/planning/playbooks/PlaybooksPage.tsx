import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AppPagination } from '@/components/ui/app-pagination'
import { getPlaybooks, savePlaybook, type Playbook, type PlaybookTask } from '@/services/admin-planning'
import { validatePlaybookTasks } from './validation'

const pageSize = 10
const newTask = (): PlaybookTask => ({ id: crypto.randomUUID(), title: '', offset: { amount: 0, unit: 'calendar_days' }, weekendPolicy: 'none', leadDays: 0, dependsOn: [] })

export function PlaybooksPage() {
  const { session } = useAuth()
  const client = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<Playbook | null>(null)
  const [name, setName] = useState('')
  const [tasks, setTasks] = useState<PlaybookTask[]>([newTask()])
  const [formError, setFormError] = useState('')
  const query = useQuery({ queryKey: ['planning-playbooks', offset], queryFn: () => getPlaybooks(session!.token, pageSize, offset), enabled: Boolean(session?.token) })
  const validationErrors = validatePlaybookTasks(tasks)
  const save = useMutation({
    mutationFn: () => {
      const errors = validatePlaybookTasks(tasks)
      if (!name.trim()) throw new Error('Playbook name is required.')
      if (errors.length) throw new Error(errors.join(' '))
      return savePlaybook(session!.token, { name: name.trim(), platform: true, tasks }, editing?.id)
    },
    onSuccess: () => { setEditing(null); setFormError(''); void client.invalidateQueries({ queryKey: ['planning-playbooks'] }) },
    onError: (error: Error) => setFormError(error.message),
  })
  const open = (playbook?: Playbook) => { setEditing(playbook ?? null); setName(playbook?.name ?? ''); setTasks(playbook?.tasks?.map((task) => ({ ...task, dependsOn: [...(task.dependsOn ?? [])] })) ?? [newTask()]); setFormError('') }
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate() }
  const status = (query.error as (Error & { status?: number }) | null)?.status
  return <section className="space-y-6"><header className="flex items-end justify-between gap-4"><div><h1 className="text-xl font-semibold">Platform playbooks</h1><p className="mt-1 text-sm text-ink-muted">Create and version task templates for event planning.</p></div><Button onClick={() => open()}>Create playbook</Button></header>
    {query.isLoading ? <p role="status">Loading playbooks…</p> : query.isError ? <p role="alert">{status === 412 ? 'Event planning is not enabled for this organization.' : query.error.message}</p> : (query.data?.playbooks ?? []).length === 0 && offset === 0 ? <p>No platform playbooks configured.</p> : <Card className="gap-0 py-0"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Name</th><th>Version</th><th>Tasks</th><th>Actions</th></tr></thead><tbody>{(query.data?.playbooks ?? []).filter((book) => book.platform).map((book) => <tr key={book.id}><td>{book.name}</td><td>{book.version}</td><td>{book.tasks?.length ?? 0}</td><td><Button variant="outline" onClick={() => open(book)}>Edit {book.name}</Button></td></tr>)}</tbody></table></div><AppPagination pageIndex={Math.floor(offset / pageSize)} pageSize={pageSize} totalItems={query.data?.total ?? 0} label="playbooks" onPageChange={(pageIndex) => setOffset(pageIndex * pageSize)} onPageSizeChange={(size) => { setOffset(0); void size }} /></CardContent></Card>}
    {editing !== null || name !== '' ? <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-surface p-4"><h2 className="font-semibold">{editing ? `Edit ${editing.name} (new version)` : 'Create playbook'}</h2><label className="block space-y-1 text-sm">Playbook name<Input value={name} onChange={(event) => setName(event.target.value)} required /></label>{tasks.map((task, index) => <fieldset key={task.id} className="space-y-2 border-t border-line pt-3"><legend>Task {index + 1}</legend><label className="block">Title<Input aria-label={`Task ${index + 1} title`} value={task.title} onChange={(event) => setTasks(tasks.map((item) => item.id === task.id ? { ...item, title: event.target.value } : item))} /></label><label>Offset amount<Input aria-label={`Task ${index + 1} offset amount`} type="number" min="0" max="730" value={task.offset.amount} onChange={(event) => setTasks(tasks.map((item) => item.id === task.id ? { ...item, offset: { ...item.offset, amount: Number(event.target.value) } } : item))} /></label><label>Offset unit<select aria-label={`Task ${index + 1} offset unit`} value={task.offset.unit} onChange={(event) => setTasks(tasks.map((item) => item.id === task.id ? { ...item, offset: { ...item.offset, unit: event.target.value as PlaybookTask['offset']['unit'] } } : item))}><option value="calendar_days">Calendar days</option><option value="calendar_weeks">Calendar weeks</option><option value="business_days">Business days</option></select></label><label>Weekend policy<select aria-label={`Task ${index + 1} weekend policy`} value={task.weekendPolicy} onChange={(event) => setTasks(tasks.map((item) => item.id === task.id ? { ...item, weekendPolicy: event.target.value as PlaybookTask['weekendPolicy'] } : item))}><option value="none">None</option><option value="roll_back">Roll back</option><option value="roll_forward">Roll forward</option></select></label><label>Lead days<Input aria-label={`Task ${index + 1} lead days`} type="number" min="0" max="365" value={task.leadDays} onChange={(event) => setTasks(tasks.map((item) => item.id === task.id ? { ...item, leadDays: Number(event.target.value) } : item))} /></label><label>Dependencies<select aria-label={`Task ${index + 1} dependencies`} multiple value={task.dependsOn} onChange={(event) => setTasks(tasks.map((item) => item.id === task.id ? { ...item, dependsOn: [...event.target.selectedOptions].map((option) => option.value) } : item))}>{tasks.filter((candidate) => candidate.id !== task.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title || 'Untitled task'}</option>)}</select></label>{validationErrors.filter((error) => error.includes(`Task ${index + 1}:`)).map((error) => <p role="alert" key={error}>{error}</p>)}</fieldset>)}<Button type="button" variant="outline" disabled={tasks.length >= 500} onClick={() => setTasks([...tasks, newTask()])}>Add task</Button>{formError && <p role="alert">{formError}</p>}<Button disabled={save.isPending || validationErrors.length > 0 || !name.trim()}>{save.isPending ? 'Saving…' : 'Save playbook'}</Button><Button type="button" variant="outline" onClick={() => open()}>Cancel</Button></form> : null}
  </section>
}
