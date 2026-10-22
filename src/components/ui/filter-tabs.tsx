export interface FilterTabOption {
  value: string
  label: string
}

export function FilterTabs({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: string
  options: readonly FilterTabOption[]
  onValueChange: (value: string) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex w-fit items-center rounded-xl bg-surface-muted p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${selected ? 'bg-surface text-brand shadow-sm dark:text-white' : 'text-ink-muted hover:text-ink'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
