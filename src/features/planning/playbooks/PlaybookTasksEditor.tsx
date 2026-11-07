import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PlaybookTask } from '@/services/admin-planning'

export function PlaybookTasksEditor({
  tasks,
  errors,
  onChange,
  onAdd,
}: {
  tasks: PlaybookTask[]
  errors: string[]
  onChange: (tasks: PlaybookTask[]) => void
  onAdd: () => void
}) {
  return (
    <>
      {tasks.map((task, index) => (
        <fieldset key={task.id} className="space-y-2 border-t border-line pt-3">
          <legend>Task {index + 1}</legend>
          <label className="block">
            Title
            <Input
              aria-label={`Task ${index + 1} title`}
              value={task.title}
              onChange={(event) =>
                onChange(
                  tasks.map((item) =>
                    item.id === task.id ? { ...item, title: event.target.value } : item,
                  ),
                )
              }
            />
          </label>
          <label>
            Offset amount
            <Input
              aria-label={`Task ${index + 1} offset amount`}
              type="number"
              min="0"
              max="730"
              value={task.offset.amount}
              onChange={(event) =>
                onChange(
                  tasks.map((item) =>
                    item.id === task.id
                      ? { ...item, offset: { ...item.offset, amount: Number(event.target.value) } }
                      : item,
                  ),
                )
              }
            />
          </label>
          <label>
            Offset unit
            <select
              aria-label={`Task ${index + 1} offset unit`}
              value={task.offset.unit}
              onChange={(event) =>
                onChange(
                  tasks.map((item) =>
                    item.id === task.id
                      ? {
                          ...item,
                          offset: {
                            ...item.offset,
                            unit: event.target.value as PlaybookTask['offset']['unit'],
                          },
                        }
                      : item,
                  ),
                )
              }
            >
              <option value="calendar_days">Calendar days</option>
              <option value="calendar_weeks">Calendar weeks</option>
              <option value="business_days">Business days</option>
            </select>
          </label>
          <label>
            Weekend policy
            <select
              aria-label={`Task ${index + 1} weekend policy`}
              value={task.weekendPolicy}
              onChange={(event) =>
                onChange(
                  tasks.map((item) =>
                    item.id === task.id
                      ? {
                          ...item,
                          weekendPolicy: event.target.value as PlaybookTask['weekendPolicy'],
                        }
                      : item,
                  ),
                )
              }
            >
              <option value="none">None</option>
              <option value="roll_back">Roll back</option>
              <option value="roll_forward">Roll forward</option>
            </select>
          </label>
          <label>
            Lead days
            <Input
              aria-label={`Task ${index + 1} lead days`}
              type="number"
              min="0"
              max="365"
              value={task.leadDays}
              onChange={(event) =>
                onChange(
                  tasks.map((item) =>
                    item.id === task.id ? { ...item, leadDays: Number(event.target.value) } : item,
                  ),
                )
              }
            />
          </label>
          <label>
            Dependencies
            <select
              aria-label={`Task ${index + 1} dependencies`}
              multiple
              value={task.dependsOn}
              onChange={(event) =>
                onChange(
                  tasks.map((item) =>
                    item.id === task.id
                      ? {
                          ...item,
                          dependsOn: [...event.target.selectedOptions].map(
                            (option) => option.value,
                          ),
                        }
                      : item,
                  ),
                )
              }
            >
              {tasks
                .filter((candidate) => candidate.id !== task.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title || 'Untitled task'}
                  </option>
                ))}
            </select>
          </label>
          {errors
            .filter((error) => error.includes(`Task ${index + 1}:`))
            .map((error) => (
              <p role="alert" key={error}>
                {error}
              </p>
            ))}
        </fieldset>
      ))}
      {errors
        .filter((error) => !error.startsWith('Task '))
        .map((error) => (
          <p role="alert" key={error}>
            {error}
          </p>
        ))}
      <Button type="button" variant="outline" disabled={tasks.length >= 500} onClick={onAdd}>
        Add task
      </Button>
    </>
  )
}
