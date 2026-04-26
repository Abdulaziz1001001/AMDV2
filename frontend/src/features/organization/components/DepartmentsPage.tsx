import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SlideOver } from '@/components/ui/SlideOver'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { upsertDepartment, deleteDepartment } from '@/features/organization/api/organizationApi'
import type { Department, Employee } from '@/features/organization/types/organization'

function managerCell(dept: Department, employees: Employee[]) {
  const m = dept.managerId
  if (!m) return '—'
  if (typeof m === 'string') {
    const e = employees.find((x) => x.id === m)
    return e ? `${e.name}${e.eid ? ` (${e.eid})` : ''}` : m
  }
  return [m.name, m.eid].filter(Boolean).join(' · ') || '—'
}

export default function DepartmentsPage() {
  const { departments, employees, sync } = useData()
  const { toast } = useToast()
  const [slideOpen, setSlideOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [name, setName] = useState('')
  const [managerId, setManagerId] = useState('')

  const activeEmployees = useMemo(() => employees.filter((e) => e.active !== false).sort((a, b) => a.name.localeCompare(b.name)), [employees])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setManagerId('')
    setSlideOpen(true)
  }

  const openEdit = (d: Department) => {
    setEditing(d)
    setName(d.name)
    const m = d.managerId
    if (!m) setManagerId('')
    else if (typeof m === 'string') setManagerId(m)
    else if (m.id) setManagerId(m.id)
    else setManagerId('')
    setSlideOpen(true)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast('Name is required', 'error')
      return
    }
    try {
      await upsertDepartment({
        id: editing?.id,
        name: trimmed,
        managerId: managerId || undefined,
      })
      await sync()
      toast(editing ? 'Department updated' : 'Department created', 'success')
      setSlideOpen(false)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department? Employees will be unassigned from it.')) return
    try {
      await deleteDepartment(id)
      await sync()
      toast('Department deleted', 'warning')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const columns: ColumnDef<Department, unknown>[] = [
    {
      id: 'icon',
      header: '',
      size: 40,
      cell: () => (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-text-secondary">
          <Building2 className="h-4 w-4" strokeWidth={1.75} />
        </div>
      ),
    },
    { accessorKey: 'name', header: 'Name' },
    {
      id: 'manager',
      header: 'Manager',
      cell: ({ row }) => <span className="text-sm text-text-secondary">{managerCell(row.original, employees)}</span>,
    },
    {
      id: 'actions',
      header: '',
      size: 88,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Department
        </Button>
      </div>

      <DataTable columns={columns} data={departments} searchColumn="name" />

      <SlideOver open={slideOpen} onOpenChange={setSlideOpen} title={editing ? 'Edit department' : 'New department'}>
        <div className="space-y-6">
          <div>
            <label htmlFor="dept-name" className="mb-1 block text-xs font-medium text-text-secondary">
              Name *
            </label>
            <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="dept-manager" className="mb-1 block text-xs font-medium text-text-secondary">
              Manager
            </label>
            <Select id="dept-manager" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">No manager</option>
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.eid ? ` (${e.eid})` : ''}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-[11px] text-text-tertiary">Assign an employee as department manager.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button variant="secondary" onClick={() => setSlideOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}
