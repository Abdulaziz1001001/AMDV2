import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Bell, Megaphone } from 'lucide-react'
import type { Announcement, Notification } from '../types/communication'
import { fetchPublicAnnouncements } from '../api/publicAnnouncements'
import {
  fetchEmployeeNotifications,
  markEmployeeNotificationRead,
  markAllEmployeeNotificationsRead,
  deleteAllEmployeeNotifications,
} from '../api/employeeNotifications'

export default function EmployeeNotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetchEmployeeNotifications()
      setNotifs(res.items)
      setUnreadCount(res.unreadCount)
    } catch {
      setNotifs([])
      setUnreadCount(0)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    fetchPublicAnnouncements().then(setAnnouncements).catch(() => {})
  }, [])

  const markRead = async (id: string) => {
    try {
      const res = await markEmployeeNotificationRead(id)
      setNotifs((n) => n.map((x) => (x.id === id ? { ...x, readAt: new Date().toISOString() } : x)))
      if (typeof res.unreadCount === 'number') setUnreadCount(res.unreadCount)
    } catch {
      /* ignore */
    }
  }

  const markAll = async () => {
    try {
      await markAllEmployeeNotificationsRead()
      setNotifs((n) => n.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      /* ignore */
    }
  }

  const clearAll = async () => {
    try {
      await deleteAllEmployeeNotifications()
      setNotifs([])
      setUnreadCount(0)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      {announcements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Megaphone className="h-4 w-4" /> Announcements
          </div>
          {announcements.slice(0, 5).map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-3 pb-3">
                <p className="text-sm font-medium text-text-primary">{a.title}</p>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">{a.body}</p>
                <p className="text-xs text-text-tertiary mt-1.5">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Bell className="h-4 w-4" /> Notifications
            {unreadCount > 0 && (
              <span className="text-xs font-normal text-text-tertiary">({unreadCount} unread)</span>
            )}
          </div>
          {(notifs.length > 0 || unreadCount > 0) && (
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              <button type="button" onClick={() => void markAll()} className="hover:text-text-secondary transition-colors">
                Mark all as read
              </button>
              <button type="button" onClick={() => void clearAll()} className="hover:text-text-secondary transition-colors">
                Clear all
              </button>
            </div>
          )}
        </div>
        {notifs.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-8">No notifications</p>
        ) : (
          notifs.map((n) => (
            <Card key={n.id} className={n.readAt ? 'opacity-60' : ''}>
              <CardContent className="pt-3 pb-3">
                <button onClick={() => !n.readAt && void markRead(n.id)} className="w-full text-left">
                  <p className="text-sm font-medium text-text-primary">{n.title}</p>
                  <p className="text-sm text-text-secondary mt-0.5">{n.body}</p>
                  <p className="text-xs text-text-tertiary mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}</p>
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
