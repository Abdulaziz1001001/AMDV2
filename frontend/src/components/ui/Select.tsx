import {
  Children,
  forwardRef,
  isValidElement,
  useMemo,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Sentinel for native `<option value="">` — Radix requires non-empty item values. */
const EMPTY_VALUE = '__amd_select_empty__'

export type SelectProps = {
  children: ReactNode
  className?: string
  disabled?: boolean
  id?: string
  name?: string
  /** Mirrors controlled `<select value>`; coerced to string. */
  value?: string | number | readonly string[]
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
  required?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
}

type OptionRow = { value: string; label: ReactNode; disabled?: boolean }

function collectOptions(children: ReactNode): OptionRow[] {
  const out: OptionRow[] = []
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === 'option') {
      const el = child as ReactElement<{ value?: string; disabled?: boolean; children?: ReactNode }>
      const raw = el.props.value
      const v = raw === undefined || raw === null ? '' : String(raw)
      out.push({
        value: v === '' ? EMPTY_VALUE : v,
        label: el.props.children,
        disabled: el.props.disabled,
      })
    }
  })
  return out
}

function toInnerValue(value: SelectProps['value']): string {
  if (value === undefined || value === null) return EMPTY_VALUE
  if (typeof value === 'number') {
    const s = String(value)
    return s === '' ? EMPTY_VALUE : s
  }
  if (typeof value === 'string') return value === '' ? EMPTY_VALUE : value
  return EMPTY_VALUE
}

function fromInnerValue(inner: string): string {
  return inner === EMPTY_VALUE ? '' : inner
}

/**
 * Radix Select (portaled) with light/dark surfaces. API matches native usage: `<option>` children
 * and `onChange` with `e.target.value`.
 */
const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, children, value, onChange, disabled, id, name, required, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby }, ref) => {
    const options = useMemo(() => collectOptions(children), [children])
    const innerValue = toInnerValue(value)

    const handleChange = (next: string) => {
      const emitted = fromInnerValue(next)
      onChange?.({ target: { value: emitted } } as ChangeEvent<HTMLSelectElement>)
    }

    return (
      <SelectPrimitive.Root value={innerValue} onValueChange={handleChange} disabled={disabled} required={required}>
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          data-name={name}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-required={required}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-foreground shadow-xs transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            '[&>span]:line-clamp-1 [&>span]:min-w-0',
            className,
          )}
        >
          <SelectPrimitive.Value placeholder="Select…" />
          <SelectPrimitive.Icon className="shrink-0 opacity-50">
            <ChevronDown className="h-4 w-4" aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            collisionPadding={8}
            className={cn(
              'z-[100050] max-h-[min(60vh,320px)] overflow-hidden rounded-lg border border-border shadow-lg outline-none',
              'bg-popover text-popover-foreground',
              'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={`${opt.value}-${String(opt.label)}`}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none',
                    'text-text-primary',
                    'focus:bg-surface-raised data-[highlighted]:bg-surface-raised',
                    'dark:text-zinc-100 dark:focus:bg-zinc-800 dark:data-[highlighted]:bg-zinc-800',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
                  )}
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  },
)

Select.displayName = 'Select'

export { Select }
