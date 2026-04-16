import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useLang } from '@/stores/LangContext'
import { navItems } from './Sidebar'
import { X } from 'lucide-react'

interface MobileNavProps {
  open: boolean
  onClose: () => void
  activePanel: string
  onNavigate: (panel: string) => void
}

export function MobileNav({ open, onClose, activePanel, onNavigate }: MobileNavProps) {
  const { t } = useLang()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed left-0 top-0 z-50 h-screen w-72 bg-surface border-r border-border-subtle flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <img src="/assets/logo-amd.png" alt="AMD" className="h-7 w-7 rounded-lg" />
                <span className="text-sm font-semibold text-text-primary">AMD United</span>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-raised">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {navItems.map((item) => {
                const isActive = activePanel === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => { onNavigate(item.key); onClose() }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}
