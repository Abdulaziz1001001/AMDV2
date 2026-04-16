import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface SlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  side?: 'right' | 'left'
  className?: string
}

export function SlideOver({ open, onOpenChange, title, children, side = 'right', className }: SlideOverProps) {
  const isRight = side === 'right'

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
                className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ x: isRight ? '100%' : '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: isRight ? '100%' : '-100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                className={cn(
                  'fixed top-0 z-50 h-screen w-full max-w-md bg-surface border-border-subtle shadow-lg focus:outline-none flex flex-col',
                  isRight ? 'right-0 border-l' : 'left-0 border-r',
                  className,
                )}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                  <Dialog.Title className="text-base font-semibold text-text-primary">{title}</Dialog.Title>
                  <Dialog.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
