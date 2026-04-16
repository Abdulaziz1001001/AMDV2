import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { createGroup, deleteGroup, type Group } from '@/api/admin'

export default function Groups() {
  const { groups, sync } = useData()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#3b82f6' })

  const handleSave = async () => {
    try {
      await createGroup(form)
      await sync()
      setOpen(false)
      toast('Group created', 'success')
    } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    try { await deleteGroup(id); await sync(); toast('Deleted', 'warning') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const columns: ColumnDef<Group, unknown>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'color', header: 'Color', cell: ({ getValue }) => <div className="h-5 w-5 rounded" style={{ backgroundColor: (getValue() as string) || '#888' }} /> },
    { accessorKey: 'weekendDays', header: 'Weekend', cell: ({ getValue }) => <span className="text-text-secondary text-xs">{((getValue() as number[]) || []).join(', ') || 'Default'}</span> },
    { id: 'actions', header: '', size: 50, cell: ({ row }) => <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-3.5 w-3.5 text-danger" /></Button> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Create</Button></div>
      <DataTable columns={columns} data={groups} searchColumn="name" />
      <Modal open={open} onOpenChange={setOpen} title="New Group">
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Color</label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
      </Modal>
    </div>
  )
}
