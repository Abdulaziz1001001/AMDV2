import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { request } from '@/api/client'
import { useLang } from '@/stores/LangContext'
import { Bell, Megaphone } from 'lucide-react'
import type { Announcement } from '@/api/admin'

interface Notif { id: string; title: string; titleAr?: string; body: string; bodyAr?: string; readAt?: string; createdAt?: string }

export default function Notifications() {
  const { lang } = useLang()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    request<Notif[]>('/admin/notifications').then(setNotifs).catch(() => {})
    request<Announcement[]>('/announcements').then(setAnnouncements).catch(() => {})
  }, [])

  const markRead = async (id: string) => {
    await request(`/admin/notifications/${id}/read`, 'PATCH').catch(() => {})
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, readAt: new Date().toISOString() } : x))
  }

  return (
    <div className="space-y-6">
      {announcements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Megaphone className="h-4 w-4" /> Announcements</div>
          {announcements.slice(0, 5).map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-3 pb-3">
                <p className="text-sm font-medium text-text-primary">{lang === 'ar' && a.titleAr ? a.titleAr : a.title}</p>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">{lang === 'ar' && a.bodyAr ? a.bodyAr : a.body}</p>
                <p className="text-xs text-text-tertiary mt-1.5">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Bell className="h-4 w-4" /> Notifications</div>
        {notifs.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-8">No notifications</p>
        ) : notifs.map((n) => (
          <Card key={n.id} className={n.readAt ? 'opacity-60' : ''}>
            <CardContent className="pt-3 pb-3">
              <button onClick={() => !n.readAt && markRead(n.id)} className="w-full text-left">
                <p className="text-sm font-medium text-text-primary">{lang === 'ar' && n.titleAr ? n.titleAr : n.title}</p>
                <p className="text-sm text-text-secondary mt-0.5">{lang === 'ar' && n.bodyAr ? n.bodyAr : n.body}</p>
                <p className="text-xs text-text-tertiary mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}</p>
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
