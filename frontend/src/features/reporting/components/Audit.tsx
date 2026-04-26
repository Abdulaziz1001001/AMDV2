import { useCallback, useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { fetchAuditLog } from '@/features/reporting/api/reportingApi'
import type { AuditEntry } from '@/features/reporting/types/reporting'

export default function Audit() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [actionFilter, setActionFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    try {
      setLogs(await fetchAuditLog({
        action: actionFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: 200,
      }))
    } catch {
      /* ignore load errors */
    }
  }, [actionFilter, from, to])

  useEffect(() => {
    void load()
  }, [load])

  const columns: ColumnDef<AuditEntry, unknown>[] = [
    { accessorKey: 'createdAt', header: 'Time', cell: ({ getValue }) => <span className="text-xs text-text-tertiary font-mono">{new Date(getValue() as string).toLocaleString()}</span> },
    { accessorKey: 'actorName', header: 'Actor', cell: ({ row }) => <span>{row.original.actorName || row.original.actorRole || '—'}</span> },
    { accessorKey: 'action', header: 'Action', cell: ({ getValue }) => <code className="text-xs px-1.5 py-0.5 rounded bg-surface-sunken">{getValue() as string}</code> },
    { accessorKey: 'target', header: 'Target', cell: ({ getValue }) => <span className="text-text-secondary text-sm">{(getValue() as string) || '—'}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Filter action..." value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="max-w-48" />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-40" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="max-w-40" />
      </div>
      <DataTable columns={columns} data={logs} pageSize={20} />
    </div>
  )
}
