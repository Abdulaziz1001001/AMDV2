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
import { LocationMap, MapPicker, type MapPoint } from '@/components/map/LocationMap'

export default function Locations() {
  const { locations, groups, sync } = useData()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', groupId: '', lat: '', lng: '', radius: '200' })

  const mapPoints: MapPoint[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    radius: l.radius,
  }))

  const latNum = form.lat === '' ? undefined : Number(form.lat)
  const lngNum = form.lng === '' ? undefined : Number(form.lng)
  const latOk = latNum !== undefined && !Number.isNaN(latNum)
  const lngOk = lngNum !== undefined && !Number.isNaN(lngNum)
  const radiusNum = Number(form.radius)
  const radiusOk = Number.isFinite(radiusNum) && radiusNum > 0

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Name is required', 'error')
      return
    }
    if (!latOk || !lngOk) {
      toast('Set latitude and longitude (use the map or enter numbers)', 'error')
      return
    }
    if (!radiusOk) {
      toast('Radius must be a positive number', 'error')
      return
    }
    try {
      await createLocation({
        name: form.name,
        groupId: form.groupId || undefined,
        lat: latNum!,
        lng: lngNum!,
        radius: radiusNum,
      })
      await sync()
      setOpen(false)
      setForm({ name: '', groupId: '', lat: '', lng: '', radius: '200' })
      toast('Location created', 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setForm({ name: '', groupId: '', lat: '', lng: '', radius: '200' })
            setOpen(true)
          }}
          size="sm"
        >
          <Plus className="h-4 w-4" /> Create
        </Button>
      </div>
      <LocationMap locations={mapPoints} />
      <DataTable columns={columns} data={locations} searchColumn="name" />
      <Modal open={open} onOpenChange={setOpen} title="New Location" size="lg">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-text-tertiary mb-2">
              Click the map or drag the pin to set coordinates. Radius controls the geofence circle.
            </p>
            <MapPicker
              lat={latOk ? latNum : undefined}
              lng={lngOk ? lngNum : undefined}
              radius={radiusOk ? radiusNum : 200}
              onChange={(la, ln) =>
                setForm((f) => ({ ...f, lat: la.toFixed(6), lng: ln.toFixed(6) }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-text-secondary block mb-1">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Latitude</label>
              <Input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Longitude</label>
              <Input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Radius (m)</label>
              <Input
                type="number"
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Group</label>
              <Select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">None</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}
