import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { request } from '@/api/client'
import { Trash2, Download, Eye } from 'lucide-react'
import { fmtDate } from '@/lib/formatters'

interface Doc { id: string; title: string; category: string; employeeId: string; originalName?: string; filename?: string; expiresAt?: string; createdAt?: string; uploadedByRole?: string }

function downloadFilename(doc: Doc): string {
  const o = doc.originalName?.trim()
  if (o) return o
  const ext = doc.filename?.includes('.') ? doc.filename.slice(doc.filename.lastIndexOf('.')) : ''
  const base = (doc.title || 'document').replace(/[^\w.\- ]+/g, '_').slice(0, 80)
  return `${base}-${String(doc.id).slice(-6)}${ext}`
}

export default function Documents() {
  const { toast } = useToast()
  const [docs, setDocs] = useState<Doc[]>([])

  const load = async () => { try { setDocs(await request('/self-service/documents')) } catch {} }
  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    try { await request(`/self-service/documents/${id}`, 'DELETE'); load(); toast('Deleted', 'warning') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const viewDoc = async (doc: Doc) => {
    try {
      const token = localStorage.getItem('amd_token')
      const res = await fetch(`/api/self-service/documents/${doc.id}/download?mode=view`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Unable to open document')
      const blob = await res.blob()
      const ct = res.headers.get('Content-Type') || blob.type || 'application/octet-stream'
      const url = URL.createObjectURL(new Blob([blob], { type: ct }))
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const downloadDoc = async (doc: Doc) => {
    try {
      const token = localStorage.getItem('amd_token')
      const res = await fetch(`/api/self-service/documents/${doc.id}/download?mode=download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Unable to download document')
      const blob = await res.blob()
      const ct = res.headers.get('Content-Type') || blob.type || 'application/octet-stream'
      const url = URL.createObjectURL(new Blob([blob], { type: ct }))
      const a = document.createElement('a')
      a.href = url
      a.download = downloadFilename(doc)
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const columns: ColumnDef<Doc, unknown>[] = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => <span className="text-xs px-2 py-0.5 rounded bg-surface-sunken text-text-secondary">{(getValue() as string).replace(/_/g, ' ')}</span> },
    { accessorKey: 'originalName', header: 'File', cell: ({ getValue }) => <span className="text-xs text-text-tertiary truncate max-w-32 block">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'expiresAt', header: 'Expires', cell: ({ getValue }) => fmtDate(getValue() as string) },
    { id: 'actions', header: '', size: 120, cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" title="View" onClick={() => viewDoc(row.original)}><Eye className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" title="Download" onClick={() => downloadDoc(row.original)}><Download className="h-3.5 w-3.5" /></Button>
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
