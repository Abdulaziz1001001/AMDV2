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
import { LocationMap, MapPicker, DEFAULT_PIN, type MapPoint } from '@/components/map/LocationMap'

const RADIUS_MIN = 50
const RADIUS_MAX = 3000
const RADIUS_PRESETS = [100, 200, 500, 1000] as const

function emptyForm() {
  return {
    name: '',
    groupId: '',
    lat: String(DEFAULT_PIN.lat),
    lng: String(DEFAULT_PIN.lng),
    radius: '200',
  }
}

export default function Locations() {
  const { locations, groups, sync } = useData()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const mapPoints: MapPoint[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    radius: l.radius,
  }))

  const latNum = Number(form.lat)
  const lngNum = Number(form.lng)
  const latOk = form.lat !== '' && Number.isFinite(latNum)
  const lngOk = form.lng !== '' && Number.isFinite(lngNum)
  const radiusNum = Number(form.radius)
  const radiusOk = Number.isFinite(radiusNum) && radiusNum >= RADIUS_MIN && radiusNum <= RADIUS_MAX

  const setRadiusClamped = (n: number) => {
    const v = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Math.round(n)))
    setForm((f) => ({ ...f, radius: String(v) }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Enter a name for this location', 'error')
      return
    }
    if (!latOk || !lngOk) {
      toast('Pin position is invalid — use the map or fine-tune coordinates', 'error')
      return
    }
    if (!radiusOk) {
      toast(`Radius must be between ${RADIUS_MIN} and ${RADIUS_MAX} meters`, 'error')
      return
    }
    try {
      await createLocation({
        name: form.name.trim(),
        groupId: form.groupId || undefined,
        lat: latNum,
        lng: lngNum,
        radius: radiusNum,
      })
      await sync()
      setOpen(false)
      setForm(emptyForm())
      toast('Location created', 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const columns: ColumnDef<Loc, unknown>[] = [
    { accessorKey: 'name', header: 'Name' },
    {
      id: 'group',
      header: 'Group',
      cell: ({ row }) => (
        <span className="text-text-secondary">
          {groups.find((g) => g.id === row.original.groupId)?.name || '—'}
        </span>
      ),
    },
    { accessorKey: 'radius', header: 'Radius (m)' },
    {
      id: 'coords',
      header: 'Coordinates',
      cell: ({ row }) => (
        <span className="text-xs text-text-tertiary font-mono">
          {row.original.lat.toFixed(4)}, {row.original.lng.toFixed(4)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 50,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm('Delete?')) deleteLocation(row.original.id).then(sync)
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-danger" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setForm(emptyForm())
            setOpen(true)
          }}
          size="sm"
        >
          <Plus className="h-4 w-4" /> Create location
        </Button>
      </div>
      <LocationMap locations={mapPoints} />
      <DataTable columns={columns} data={locations} searchColumn="name" />
      <Modal open={open} onOpenChange={setOpen} title="New location" size="xl">
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Drop the pin</h3>
            <p className="text-xs text-text-tertiary mb-3">
              A pin starts in Riyadh — click the map or drag the pin to your site. The blue circle shows the
              check-in area.
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-text-primary">Geofence radius</label>
              <span className="text-sm tabular-nums font-medium text-accent">
                {radiusOk ? radiusNum : 200} m
              </span>
            </div>
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={25}
              value={radiusOk ? radiusNum : 200}
              onChange={(e) => setRadiusClamped(Number(e.target.value))}
              className="w-full h-2 accent-accent rounded-full appearance-none bg-surface-raised cursor-pointer"
            />
            <div className="flex flex-wrap gap-2">
              {RADIUS_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRadiusClamped(m)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    radiusOk && radiusNum === m
                      ? 'bg-accent text-white'
                      : 'bg-surface-raised text-text-secondary hover:bg-surface-sunken border border-border-subtle'
                  }`}
                >
                  {m} m
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-text-secondary block mb-1">Location name *</label>
              <Input
                placeholder="e.g. Main office — reception"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-text-secondary block mb-1">Group (optional)</label>
              <Select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">All employees / no group filter</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <details className="rounded-lg border border-border-subtle bg-surface-sunken/50 px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium text-text-secondary select-none">
              Fine-tune coordinates
            </summary>
            <div className="grid grid-cols-2 gap-3 mt-3 pt-1">
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </details>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save location</Button>
        </div>
      </Modal>
    </div>
  )
}
