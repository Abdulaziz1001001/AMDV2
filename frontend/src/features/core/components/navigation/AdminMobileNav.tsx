import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useLang } from '@/stores/LangContext'
import { useAuth } from '@/stores/AuthContext'
import { navGroups } from './AdminSidebar'
import { BrandLogo } from '@/features/core/components/BrandLogo'
import { LogOut, X } from 'lucide-react'

interface MobileNavProps {
  open: boolean
  onClose: () => void
  activePanel: string
  onNavigate: (panel: string) => void
}

export function MobileNav({ open, onClose, activePanel, onNavigate }: MobileNavProps) {
  const { t, lang } = useLang()
  const { session, logout } = useAuth()
  const displayName = session?.name?.trim() || session?.username || 'AMD'
  const initial = (displayName[0] || 'A').toUpperCase()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.nav
            initial={{ x: lang === 'ar' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: lang === 'ar' ? '100%' : '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className={cn(
              'fixed top-0 z-50 flex h-dvh w-[min(20rem,100vw)] flex-col border-[#1f1f1f] bg-[#121212] lg:hidden',
              lang === 'ar' ? 'right-0 border-l' : 'left-0 border-r',
            )}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#1f1f1f] px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1">
                  <BrandLogo size="md" className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold uppercase tracking-wide text-white">AMD United</p>
                  <p className="text-xs text-zinc-500">{t('adminPanel')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {navGroups.map((group) => (
                <div key={group.id} className="mb-1">
                  <p
                    className={cn(
                      'mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500',
                      group.id === 'menu' ? 'mt-0' : 'mt-5',
                    )}
                  >
                    {t(group.labelKey)}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activePanel === item.key
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            onNavigate(item.key)
                            onClose()
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors',
                            isActive
                              ? 'bg-[#E05A2C]/15 text-[#E05A2C]'
                              : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100',
                          )}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{t(item.labelKey)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-[#1f1f1f] p-3">
              <div className="flex items-center gap-3 rounded-lg px-1 py-1">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E05A2C] text-xs font-semibold text-white"
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
                  <p className="text-xs text-zinc-500">{t('adminRole')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-[#E05A2C]"
                  title={t('logout')}
                  aria-label={t('logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}
