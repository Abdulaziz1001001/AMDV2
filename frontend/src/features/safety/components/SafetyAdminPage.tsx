import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { SlideOver } from '@/components/ui/SlideOver'
import { useToast } from '@/components/ui/Toast'
import { useAdminNav } from '@/stores/AdminNavContext'
import { fetchSafetyIncidents, updateSafetyIncidentStatus } from '@/features/safety/api/safetyApi'
import type { SafetyIncident, SafetyIncidentStatus } from '@/features/safety/types/safety'
import { fmtDate } from '@/lib/formatters'

export default function Safety() {
  const { toast } = useToast()
  const { pendingSafetyIncidentId, clearPendingSafetyFocus } = useAdminNav()
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [selected, setSelected] = useState<SafetyIncident | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    try {
      setIncidents(await fetchSafetyIncidents())
    } catch {
      /* ignore load errors */
    }
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (pendingSafetyIncidentId) setStatusFilter('')
  }, [pendingSafetyIncidentId])

  useEffect(() => {
    if (!pendingSafetyIncidentId || incidents.length === 0) return
    const inc = incidents.find((i) => i.id === pendingSafetyIncidentId)
    if (!inc) {
      clearPendingSafetyFocus()
      return
    }
    setSelected(inc)
    const t = window.setTimeout(() => {
      document.getElementById(`dt-row-${pendingSafetyIncidentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearPendingSafetyFocus()
    }, 200)
    return () => window.clearTimeout(t)
  }, [pendingSafetyIncidentId, incidents, clearPendingSafetyFocus])

  const filtered = statusFilter ? incidents.filter(i => i.status === statusFilter) : incidents

  const updateStatus = async (id: string, status: SafetyIncidentStatus) => {
    try { await updateSafetyIncidentStatus(id, status); load(); toast('Updated', 'success'); setSelected(null) } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const columns: ColumnDef<SafetyIncident, unknown>[] = [
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => fmtDate(getValue() as string) },
    { accessorKey: 'reporterName', header: 'Reporter' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="truncate max-w-48 block text-text-secondary">{(getValue() as string).slice(0, 60)}</span> },
    { accessorKey: 'severity', header: 'Severity', cell: ({ getValue }) => <Badge status={getValue() as string} /> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge status={getValue() as string} /> },
    { id: 'actions', header: '', size: 60, cell: ({ row }) => <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}>View</Button> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-44"><option value="">All Statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="closed">Closed</option></Select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchColumn="reporterName"
        getRowId={(row) => row.id}
        highlightRowId={pendingSafetyIncidentId}
      />

      <SlideOver open={!!selected} onOpenChange={() => setSelected(null)} title="Incident Details">
        {selected && (
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-text-tertiary">Date</label><p className="text-text-primary">{fmtDate(selected.date)}</p></div>
            <div><label className="text-xs font-medium text-text-tertiary">Reporter</label><p className="text-text-primary">{selected.reporterName}</p></div>
            <div><label className="text-xs font-medium text-text-tertiary">Description</label><p className="text-sm text-text-primary">{selected.description}</p></div>
            <div className="flex gap-2"><Badge status={selected.severity} /><Badge status={selected.status} /></div>
            {selected.resolution && <div><label className="text-xs font-medium text-text-tertiary">Resolution</label><p className="text-sm text-text-primary">{selected.resolution}</p></div>}
            <div className="flex gap-2 pt-4 border-t border-border-subtle">
              {selected.status === 'open' && <Button size="sm" onClick={() => updateStatus(selected.id, 'investigating')}>Investigate</Button>}
              {(selected.status === 'open' || selected.status === 'investigating') && <Button size="sm" variant="success" onClick={() => updateStatus(selected.id, 'resolved')}>Resolve</Button>}
              {selected.status === 'resolved' && <Button size="sm" variant="secondary" onClick={() => updateStatus(selected.id, 'closed')}>Close</Button>}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}
