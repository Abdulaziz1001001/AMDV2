import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { useLang } from '@/stores/LangContext'
import { createEmployee, deleteEmployee } from '@/features/organization/api/organizationApi'
import type { Employee } from '@/features/organization/types/organization'
import { cn } from '@/lib/cn'

export default function EmployeesPage() {
  const { employees, groups, departments, sync } = useData()
  const { toast } = useToast()
  const { t } = useLang()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ name: '', username: '', password: '', email: '', phone: '', groupId: '', departmentId: '', jobTitle: '', workStart: '', workEnd: '', salary: '' })

  const activeCount = useMemo(() => employees.filter((e) => e.active).length, [employees])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', username: '', password: '', email: '', phone: '', groupId: '', departmentId: '', jobTitle: '', workStart: '07:00', workEnd: '16:00', salary: '' })
    setModalOpen(true)
  }

  const openEdit = (emp: Employee) => {
    setEditing(emp)
    setForm({ name: emp.name, username: emp.username, password: '', email: emp.email || '', phone: emp.phone || '', groupId: emp.groupId || '', departmentId: emp.departmentId || '', jobTitle: emp.jobTitle || '', workStart: emp.workStart || '', workEnd: emp.workEnd || '', salary: emp.salary ? String(emp.salary) : '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      await createEmployee({ ...form, salary: form.salary ? Number(form.salary) : undefined, id: editing?.id } as never)
      await sync()
      setModalOpen(false)
      toast(editing ? 'Employee updated' : 'Employee created', 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee?')) return
    try {
      await deleteEmployee(id)
      await sync()
      toast('Employee deleted', 'warning')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const columns: ColumnDef<Employee, unknown>[] = [
    { accessorKey: 'eid', header: 'ID', size: 60 },
    { accessorKey: 'name', header: t('name') },
    { accessorKey: 'username', header: t('username') },
    { accessorKey: 'jobTitle', header: 'Job Title', cell: ({ getValue }) => <span className="text-text-secondary">{(getValue() as string) || '—'}</span> },
    {
      id: 'department',
      header: t('department'),
      cell: ({ row }) => {
        const d = departments.find((x) => x.id === row.original.departmentId)
        return <span className="text-text-secondary">{d?.name || '—'}</span>
      },
    },
    {
      accessorKey: 'active',
      header: t('status'),
      cell: ({ row }) => {
        const isActive = row.original.active === true
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              isActive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
            )}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      size: 80,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Edit2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-3.5 w-3.5 text-danger" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {activeCount} active · {employees.length} total
        </p>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4" /> {t('create')}</Button>
      </div>

      <DataTable columns={columns} data={employees} searchColumn="name" searchPlaceholder={`${t('search')} ${t('employees').toLowerCase()}...`} />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Edit Employee' : 'New Employee'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Username *</label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Password {editing ? '(leave blank to keep)' : '*'}</label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Job Title</label><Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Group</label>
            <Select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">None</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Department</label>
            <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Work Start</label><Input type="time" value={form.workStart} onChange={(e) => setForm({ ...form, workStart: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Work End</label><Input type="time" value={form.workEnd} onChange={(e) => setForm({ ...form, workEnd: e.target.value })} /></div>
          <div><label className="text-xs font-medium text-text-secondary block mb-1">Salary</label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-subtle">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave}>{t('save')}</Button>
        </div>
      </Modal>
    </div>
  )
}
