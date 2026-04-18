import { useEffect, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/stores/LangContext'
import { cn } from '@/lib/cn'
import {
  fetchEmployeeNotifications,
  markEmployeeNotificationRead,
  markAllEmployeeNotificationsRead,
  deleteAllEmployeeNotifications,
} from '@/api/employeeNotifications'
import type { Notification } from '@/api/admin'

export function EmployeeNotificationPopover() {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [badgeOverride, setBadgeOverride] = useState<number | null>(null)
  const [serverUnread, setServerUnread] = useState(0)

  const displayUnread = badgeOverride !== null ? badgeOverride : serverUnread

  useEffect(() => {
    fetchEmployeeNotifications()
      .then((r) => setServerUnread(r.unreadCount))
      .catch(() => setServerUnread(0))
  }, [])

  useEffect(() => {
    setBadgeOverride(null)
  }, [serverUnread])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchEmployeeNotifications()
      .then((r) => {
        setItems(r.items)
        setServerUnread(r.unreadCount)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [open])

  const onReadOne = async (id: string) => {
    try {
      const res = await markEmployeeNotificationRead(id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)))
      if (typeof res.unreadCount === 'number') setServerUnread(res.unreadCount)
    } catch {
      /* ignore */
    }
  }

  const onReadAll = async () => {
    try {
      await markAllEmployeeNotificationsRead()
      setBadgeOverride(0)
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })))
      setServerUnread(0)
    } catch {
      /* ignore */
    }
  }

  const onClearAll = async () => {
    try {
      await deleteAllEmployeeNotifications()
      setBadgeOverride(0)
      setItems([])
      setServerUnread(0)
    } catch {
      /* ignore */
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notifications" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {displayUnread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
            >
              {displayUnread > 9 ? '9+' : displayUnread}
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
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
          </div>
          <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
            {loading ? (
              <p className="px-3 py-8 text-center text-sm text-text-tertiary">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-text-tertiary">No notifications</p>
            ) : (
              <ul className="py-1">
                {items.map((n) => {
                  const t = lang === 'ar' && n.titleAr ? n.titleAr : n.title
                  const b = lang === 'ar' && n.bodyAr ? n.bodyAr : n.body
                  const unread = !n.readAt
                  return (
                    <li key={n.id} className="border-b border-border-subtle/80 last:border-0">
                      <button
                        type="button"
                        className={cn(
                          'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-raised',
                          unread && 'bg-accent-soft/30',
                        )}
                        onClick={() => void onReadOne(n.id)}
                      >
                        <span className="text-sm font-medium text-text-primary">{t || '—'}</span>
                        {b && <span className="text-xs leading-snug text-text-secondary line-clamp-3">{b}</span>}
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
          {(items.length > 0 || displayUnread > 0) && (
            <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-3 py-2">
              <button type="button" onClick={() => void onReadAll()} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                Mark all as read
              </button>
              <button type="button" onClick={() => void onClearAll()} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                Clear all
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
