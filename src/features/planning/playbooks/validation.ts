import type { PlaybookTask } from '@/services/admin-planning'

export function validatePlaybookTasks(tasks: PlaybookTask[]): string[] {
  const errors: string[] = []
  if (tasks.length > 500) errors.push('A playbook can contain at most 500 tasks.')
  const titles = new Set<string>()
  tasks.forEach((task, index) => {
    const title = task.title.trim().toLocaleLowerCase()
    if (!title) errors.push(`Task ${index + 1}: title is required.`)
    else if (titles.has(title)) errors.push(`Task ${index + 1}: task titles must be unique.`)
    titles.add(title)
    if (!Number.isInteger(task.offset.amount) || task.offset.amount < 0 || task.offset.amount > 730) errors.push(`Task ${index + 1}: offset must be between 0 and 730.`)
    if (!Number.isInteger(task.leadDays) || task.leadDays < 0 || task.leadDays > 365) errors.push(`Task ${index + 1}: lead days must be between 0 and 365.`)
    if (task.dependsOn.includes(task.id)) errors.push(`Task ${index + 1}: a task cannot depend on itself.`)
  })
  const byId = new Map(tasks.map((task) => [task.id, task]))
  const visited = new Set<string>()
  const active: string[] = []
  const visit = (id: string): string[] | null => {
    const cycleAt = active.indexOf(id)
    if (cycleAt >= 0) return [...active.slice(cycleAt), id]
    if (visited.has(id)) return null
    active.push(id)
    for (const dependency of byId.get(id)?.dependsOn ?? []) {
      const cycle = visit(dependency)
      if (cycle) return cycle
    }
    active.pop()
    visited.add(id)
    return null
  }
  for (const task of tasks) {
    const cycle = visit(task.id)
    if (cycle) {
      errors.push(`Dependency cycle: ${cycle.map((id) => byId.get(id)?.title ?? id).join(' → ')}`)
      break
    }
  }
  return errors
}
