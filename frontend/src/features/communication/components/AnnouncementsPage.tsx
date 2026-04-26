import { useState } from 'react'
import { Plus, Trash2, Pin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { request } from '@/api/client'

export default function AnnouncementsPage() {
  const { announcements, sync } = useData()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', titleAr: '', body: '', bodyAr: '', pinned: false })

  const save = async () => {
    try { await request('/announcements', 'POST', form); await sync(); setOpen(false); toast('Published', 'success') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete?')) return
    try {
      await request(`/announcements/${id}`, 'DELETE')
      await sync()
      toast('Deleted', 'warning')
    } catch {
      /* ignore delete errors */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Create</Button></div>
      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><h4 className="font-medium text-text-primary">{a.title}</h4>{a.pinned && <Pin className="h-3.5 w-3.5 text-warning" />}</div>
                  <p className="text-sm text-text-secondary mt-1 line-clamp-2">{a.body}</p>
                  <p className="text-xs text-text-tertiary mt-2">{a.createdByName || 'Admin'} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5 text-danger" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Modal open={open} onOpenChange={setOpen} title="New Announcement">
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Title (EN) *</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Title (AR)</label><Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} dir="rtl" /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Body (EN) *</label><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Body (AR)</label><textarea value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-accent/30" dir="rtl" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Publish</Button></div>
      </Modal>
    </div>
  )
}
