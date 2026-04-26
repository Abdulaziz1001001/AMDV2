import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { createProject, deleteProject } from '@/features/projects/api/projectsApi'
import type { Project } from '@/features/projects/types/projects'

export default function ProjectsPage() {
  const { projects, sync } = useData()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', address: '', lat: '', lng: '', radius: '500' })

  const handleSave = async () => {
    try {
      await createProject({
        ...form,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        radius: Number(form.radius),
      })
      await sync()
      setOpen(false)
      toast('Project saved', 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const columns: ColumnDef<Project, unknown>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'code', header: 'Code', cell: ({ getValue }) => <code className="text-xs">{(getValue() as string) || '—'}</code> },
    { accessorKey: 'address', header: 'Address', cell: ({ getValue }) => <span className="text-text-secondary text-sm truncate max-w-40 block">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge status={getValue() as string} /> },
    { id: 'actions', header: '', size: 50, cell: ({ row }) => <Button variant="ghost" size="icon" onClick={async () => { if (confirm('Delete?')) { await deleteProject(row.original.id); await sync() } }}><Trash2 className="h-3.5 w-3.5 text-danger" /></Button> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Create</Button></div>
      <DataTable columns={columns} data={projects} searchColumn="name" />
      <Modal open={open} onOpenChange={setOpen} title="New Project / Site">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-medium text-text-secondary block mb-1">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Code</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Radius (m)</label><Input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs font-medium text-text-secondary block mb-1">Address</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
      </Modal>
    </div>
  )
}
