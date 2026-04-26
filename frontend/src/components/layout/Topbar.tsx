import { useCallback, useEffect, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Bell, Globe, Moon, Sun, RefreshCw, LogOut, Menu } from 'lucide-react'
import { useTheme } from '@/stores/ThemeContext'
import { useLang } from '@/stores/LangContext'
import { useAuth } from '@/stores/AuthContext'
import { useData } from '@/stores/DataContext'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAllAdminNotifications,
} from '@/features/communication/api/adminNotifications'
import type { Notification } from '@/features/communication/types/communication'

interface TopbarProps {
  title: string
  unreadCount?: number
  onRefresh?: () => void
  refreshing?: boolean
  onMenuClick?: () => void
}

export function Topbar({ title, unreadCount = 0, onRefresh, refreshing, onMenuClick }: TopbarProps) {
  const { theme, toggle: toggleTheme } = useTheme()
  const { toggle: toggleLang, lang, t } = useLang()
  const { logout, session } = useAuth()
  const { sync } = useData()

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifItems, setNotifItems] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  /** Cleared when parent `unreadCount` updates after sync */
  const [unreadBadgeOverride, setUnreadBadgeOverride] = useState<number | null>(null)

  const displayUnreadCount = unreadBadgeOverride !== null ? unreadBadgeOverride : unreadCount

  useEffect(() => {
    setUnreadBadgeOverride(null)
  }, [unreadCount])

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await fetchNotifications()
      setNotifItems(res.items)
    } catch {
      setNotifItems([])
    } finally {
      setNotifLoading(false)
    }
  }, [])

  useEffect(() => {
    if (notifOpen) void loadNotifications()
  }, [notifOpen, loadNotifications])

  const handleReadOne = async (id: string) => {
    try {
      const res = await markNotificationRead(id)
      setNotifItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)))
      if (typeof res.unreadCount === 'number') setUnreadBadgeOverride(res.unreadCount)
      await sync()
    } catch {
      /* ignore mark-read errors */
    }
  }

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead()
      setUnreadBadgeOverride(0)
      setNotifItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })))
      await sync()
    } catch {
      /* ignore mark-all-read errors */
    }
  }

  const handleClearAll = async () => {
    try {
      await deleteAllAdminNotifications()
      setUnreadBadgeOverride(0)
      setNotifItems([])
      await sync()
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-surface/80 backdrop-blur-xl px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <BrandLogo size="sm" className="hidden shrink-0 sm:block" />
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onRefresh} title={t('refresh')}>
          <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 0.8, ease: 'linear', repeat: refreshing ? Infinity : 0 }}>
            <RefreshCw className="h-4 w-4" />
          </motion.div>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleLang} title={lang === 'en' ? 'العربية' : 'English'}>
          <Globe className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} title={t('toggleThemeTooltip')}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Popover.Root open={notifOpen} onOpenChange={setNotifOpen}>
          <Popover.Trigger asChild>
            <Button variant="ghost" size="icon" className="relative" title={t('notifications')} aria-label={t('notifications')}>
              <Bell className="h-4 w-4" />
              {displayUnreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
                >
                  {displayUnreadCount > 9 ? '9+' : displayUnreadCount}
                </motion.span>
              )}
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={16}
              className="z-[10100] w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-border-subtle bg-popover text-popover-foreground shadow-lg outline-none"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="border-b border-border-subtle px-3 py-2">
                <p className="text-sm font-semibold text-text-primary">{t('notifications')}</p>
              </div>
              <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
                {notifLoading ? (
                  <p className="px-3 py-8 text-center text-sm text-text-tertiary">{t('notifLoading')}</p>
                ) : notifItems.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-text-tertiary">{t('noNotifications')}</p>
                ) : (
                  <ul className="py-1">
                    {notifItems.map((n) => {
                      const titleText = lang === 'ar' && n.titleAr ? n.titleAr : n.title
                      const bodyText = lang === 'ar' && n.bodyAr ? n.bodyAr : n.body
                      const unread = !n.readAt
                      return (
                        <li key={n.id} className="border-b border-border-subtle/80 last:border-0">
                          <button
                            type="button"
                            className={cn(
                              'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-raised',
                              unread && 'bg-accent-soft/30',
                            )}
                            onClick={() => void handleReadOne(n.id)}
                          >
                            <span className="text-sm font-medium text-text-primary">{titleText || '—'}</span>
                            {bodyText && (
                              <span className="text-xs leading-snug text-text-secondary line-clamp-3">{bodyText}</span>
                            )}
                            {n.createdAt && (
                              <span className="text-[10px] text-text-tertiary">{new Date(n.createdAt).toLocaleString()}</span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              {(notifItems.length > 0 || displayUnreadCount > 0) && (
                <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-3 py-2">
                  <button
                    type="button"
                    onClick={() => void handleReadAll()}
                    className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {t('markAllRead')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearAll()}
                    className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {t('clearAllNotif')}
                  </button>
                </div>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <div className="mx-2 h-6 w-px bg-border-subtle" />

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
            {session?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span className="hidden sm:block text-sm font-medium text-text-primary">{session?.name || 'Admin'}</span>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} title={t('logout')}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
