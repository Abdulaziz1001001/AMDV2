import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { createLocation, deleteLocation, type Location as Loc } from '@/api/admin'

export default function Locations() {
  const { locations, groups, sync } = useData()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', groupId: '', lat: '', lng: '', radius: '200' })

  const handleSave = async () => {
    try {
      await createLocation({ name: form.name, groupId: form.groupId || undefined, lat: Number(form.lat), lng: Number(form.lng), radius: Number(form.radius) })
      await sync(); setOpen(false); toast('Location created', 'success')
    } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const columns: ColumnDef<Loc, unknown>[] = [
    { accessorKey: 'name', header: 'Name' },
    { id: 'group', header: 'Group', cell: ({ row }) => <span className="text-text-secondary">{groups.find((g) => g.id === row.original.groupId)?.name || '—'}</span> },
    { accessorKey: 'radius', header: 'Radius (m)' },
    { id: 'coords', header: 'Coordinates', cell: ({ row }) => <span className="text-xs text-text-tertiary font-mono">{row.original.lat.toFixed(4)}, {row.original.lng.toFixed(4)}</span> },
    { id: 'actions', header: '', size: 50, cell: ({ row }) => <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete?')) deleteLocation(row.original.id).then(sync) }}><Trash2 className="h-3.5 w-3.5 text-danger" /></Button> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Create</Button></div>
      <DataTable columns={columns} data={locations} searchColumn="name" />
      <Modal open={open} onOpenChange={setOpen} title="New Location">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-medium text-text-secondary block mb-1">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Latitude</label><Input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Longitude</label><Input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Radius (m)</label><Input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Group</label>
            <Select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}><option value="">None</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
      </Modal>
    </div>
  )
}
