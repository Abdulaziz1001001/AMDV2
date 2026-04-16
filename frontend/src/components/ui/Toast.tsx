import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors: Record<ToastType, string> = {
  success: 'text-success border-success/20',
  error: 'text-danger border-danger/20',
  warning: 'text-warning border-warning/20',
  info: 'text-accent border-accent/20',
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.type]
            return (
              <ToastPrimitive.Root key={t.id} asChild forceMount>
                <motion.div
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 shadow-md mb-2',
                    colors[t.type],
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <p className="flex-1 text-sm font-medium text-text-primary">{t.message}</p>
                  <ToastPrimitive.Close className="shrink-0 text-text-tertiary hover:text-text-primary">
                    <X className="h-4 w-4" />
                  </ToastPrimitive.Close>
                </motion.div>
              </ToastPrimitive.Root>
            )
          })}
        </AnimatePresence>
        <ToastPrimitive.Viewport className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse w-80" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
