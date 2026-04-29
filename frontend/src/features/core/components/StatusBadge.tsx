import { cn } from '@/lib/cn'
import { STATUS_MAP, type StatusKey } from '@/lib/constants'

const colorMap: Record<string, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-surface-sunken text-text-tertiary',
}

interface BadgeProps {
  status: string
  className?: string
}

export function Badge({ status, className }: BadgeProps) {
  const entry = STATUS_MAP[status as StatusKey]
  const label = entry ? entry.label : status
  const color = entry ? (colorMap[entry.color] ?? colorMap.muted) : colorMap.muted

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide',
        color,
        className,
      )}
    >
      {label}
    </span>
  )
}
