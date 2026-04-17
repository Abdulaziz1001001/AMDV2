import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onOpenChange, title, description, children, className, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn(
                  'fixed left-1/2 top-1/2 z-[10001] isolate w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface border border-border-subtle shadow-lg focus:outline-none',
                  sizes[size],
                  className,
                )}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                  <div>
                    <Dialog.Title className="text-base font-semibold text-text-primary">{title}</Dialog.Title>
                    {description && (
                      <Dialog.Description className="mt-0.5 text-sm text-text-tertiary">{description}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
                <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
