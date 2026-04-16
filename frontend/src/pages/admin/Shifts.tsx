import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Star } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { request } from '@/api/client'
import type { Shift } from '@/api/admin'

export default function Shifts() {
  const { shifts, sync } = useData()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', startTime: '07:00', endTime: '16:00', color: '#3b82f6' })

  const handleSave = async () => {
    try { await request('/shifts', 'POST', form); await sync(); setOpen(false); toast('Shift saved', 'success') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    try { await request(`/shifts/${id}`, 'DELETE'); await sync(); toast('Deleted', 'warning') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const columns: ColumnDef<Shift, unknown>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.original.color || '#888' }} />{row.original.name}</div> },
    { accessorKey: 'startTime', header: 'Start' },
    { accessorKey: 'endTime', header: 'End' },
    { accessorKey: 'isDefault', header: 'Default', cell: ({ getValue }) => getValue() ? <Star className="h-4 w-4 text-warning fill-warning" /> : null },
    { id: 'actions', header: '', size: 50, cell: ({ row }) => <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-3.5 w-3.5 text-danger" /></Button> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Create</Button></div>
      <DataTable columns={columns} data={shifts} searchColumn="name" />
      <Modal open={open} onOpenChange={setOpen} title="New Shift">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-medium text-text-secondary block mb-1">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Start Time</label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">End Time</label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
      </Modal>
    </div>
  )
}
