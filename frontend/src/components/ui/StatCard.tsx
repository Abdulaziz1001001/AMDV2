import type { KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color?: 'accent' | 'success' | 'warning' | 'danger'
  onClick?: () => void
}

const bgMap = {
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function StatCard({ label, value, icon: Icon, color = 'accent', onClick }: StatCardProps) {
  const interactive = Boolean(onClick)

  const onKeyDown = interactive
    ? (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }
    : undefined

  return (
    <motion.div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${label}: ${value}. Press Enter to open.` : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'group rounded-xl bg-surface border border-border-subtle p-5 shadow-xs transition-shadow hover:shadow-sm',
        interactive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2',
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', bgMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</p>
          <motion.p
            key={String(value)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl font-semibold tracking-tight text-text-primary"
          >
            {value}
          </motion.p>
        </div>
      </div>
    </motion.div>
  )
}
