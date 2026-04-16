import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { request } from '@/api/client'
import { Trash2, Download } from 'lucide-react'
import { fmtDate } from '@/lib/formatters'

interface Doc { id: string; title: string; category: string; employeeId: string; originalName?: string; expiresAt?: string; createdAt?: string; uploadedByRole?: string }

export default function Documents() {
  const { toast } = useToast()
  const [docs, setDocs] = useState<Doc[]>([])

  const load = async () => { try { setDocs(await request('/self-service/documents')) } catch {} }
  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    try { await request(`/self-service/documents/${id}`, 'DELETE'); load(); toast('Deleted', 'warning') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const columns: ColumnDef<Doc, unknown>[] = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => <span className="text-xs px-2 py-0.5 rounded bg-surface-sunken text-text-secondary">{(getValue() as string).replace(/_/g, ' ')}</span> },
    { accessorKey: 'originalName', header: 'File', cell: ({ getValue }) => <span className="text-xs text-text-tertiary truncate max-w-32 block">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'expiresAt', header: 'Expires', cell: ({ getValue }) => fmtDate(getValue() as string) },
    { id: 'actions', header: '', size: 80, cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => window.open(`/api/self-service/documents/${row.original.id}/download`)}><Download className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-3.5 w-3.5 text-danger" /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={docs} searchColumn="title" searchPlaceholder="Search documents..." />
    </div>
  )
}
