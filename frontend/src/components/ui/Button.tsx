import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover shadow-xs hover:shadow-sm active:scale-[0.98]',
        secondary: 'bg-surface-raised text-text-primary border border-border hover:bg-surface-sunken active:scale-[0.98]',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
        danger: 'bg-danger text-white hover:bg-danger/90 active:scale-[0.98]',
        success: 'bg-success text-white hover:bg-success/90 active:scale-[0.98]',
        approval:
          'bg-emerald-100 text-emerald-900 hover:bg-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/50 active:scale-[0.98]',
        decline:
          'bg-red-100 text-red-900 hover:bg-red-200/90 dark:bg-red-950/60 dark:text-red-100 dark:hover:bg-red-900/50 active:scale-[0.98]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

export { Button }
