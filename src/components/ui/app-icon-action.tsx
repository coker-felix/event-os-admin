import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface AppIconActionProps {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  showLabel?: boolean
}

export function AppIconAction({ label, icon, onClick, disabled, showLabel = false }: AppIconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={showLabel ? 'sm' : 'icon-sm'}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="rounded-full bg-surface-muted text-ink-muted hover:bg-line hover:text-ink"
          />
        }
      >
        {icon}
        {showLabel && <span>{label}</span>}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
