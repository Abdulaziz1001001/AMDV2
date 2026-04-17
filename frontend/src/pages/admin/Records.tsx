import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useData } from '@/stores/DataContext'
import { fmtTime, todayStr } from '@/lib/formatters'
import { Download } from 'lucide-react'
import {
  downloadAttendanceRecordsPdf,
  downloadAttendanceRecordsExcel,
  type AttendanceRecordExportRow,
} from '@/lib/exportTable'

export default function Records() {
  const { records, employees } = useData()
  const [dateFilter, setDateFilter] = useState(todayStr())
  const [statusFilter, setStatusFilter] = useState('')
  const [exporting, setExporting] = useState<'pdf' | null>(null)

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (dateFilter && r.date !== dateFilter) return false
        if (statusFilter && r.status !== statusFilter) return false
        return true
      })
      .map((r) => {
        const emp = employees.find((e) => e.id === r.employeeId)
        return { ...r, empName: emp?.name || 'Unknown', empEid: emp?.eid || '—' }
      })
  }, [records, employees, dateFilter, statusFilter])

  const exportRows: AttendanceRecordExportRow[] = useMemo(
    () =>
      filtered.map((r) => ({
        empEid: r.empEid,
        empName: r.empName,
        date: r.date,
        checkIn: fmtTime(r.checkIn),
        checkOut: fmtTime(r.checkOut),
        status: r.status,
        notes: r.notes?.trim() || '',
      })),
    [filtered],
  )

  const onExportPdf = async () => {
    if (!exportRows.length) return
    setExporting('pdf')
    try {
      await downloadAttendanceRecordsPdf(exportRows)
    } finally {
      setExporting(null)
    }
  }

  const onExportExcel = () => {
    if (!exportRows.length) return
    downloadAttendanceRecordsExcel(exportRows)
  }

  const columns: ColumnDef<(typeof filtered)[0], unknown>[] = [
    { accessorKey: 'empEid', header: 'ID', size: 60 },
    { accessorKey: 'empName', header: 'Name' },
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'checkIn', header: 'In', cell: ({ row }) => fmtTime(row.original.checkIn) },
    { accessorKey: 'checkOut', header: 'Out', cell: ({ row }) => fmtTime(row.original.checkOut) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge status={getValue() as string} /> },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ getValue }) => (
        <span className="text-xs text-text-tertiary truncate max-w-32 block">{(getValue() as string) || '—'}</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-end">
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-44" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-40">
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="early_leave">Early Leave</option>
        </Select>
        <Button variant="secondary" disabled={filtered.length === 0 || exporting !== null} onClick={() => void onExportPdf()}>
          Export PDF <Download className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="secondary" disabled={filtered.length === 0} onClick={onExportExcel}>
          Export Excel <Download className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <DataTable columns={columns} data={filtered} searchColumn="empName" pageSize={15} />
    </div>
  )
}
