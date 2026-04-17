import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { fetchAttendanceReport } from '@/api/admin'
import { Download } from 'lucide-react'
import {
  downloadAttendanceReportPdf,
  downloadAttendanceReportExcel,
  type AttendanceReportEmployeeRow,
  type AttendanceReportDeptRow,
} from '@/lib/exportTable'

export default function Reports() {
  const { employees } = useData()
  const { toast } = useToast()
  const [empId, setEmpId] = useState('')
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [data, setData] = useState<AttendanceReportEmployeeRow[]>([])
  const [depts, setDepts] = useState<AttendanceReportDeptRow[]>([])
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)

  const generate = async () => {
    try {
      const res = await fetchAttendanceReport({ employeeId: empId || undefined, month, year })
      const r = res as { employees?: AttendanceReportEmployeeRow[]; departments?: AttendanceReportDeptRow[] }
      setData(r.employees || (Array.isArray(res) ? res as AttendanceReportEmployeeRow[] : []))
      setDepts(r.departments || [])
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const onExportPdf = async () => {
    if (!data.length && !depts.length) return
    setExporting('pdf')
    try {
      await downloadAttendanceReportPdf(data, depts, month, year)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    } finally {
      setExporting(null)
    }
  }

  const onExportExcel = () => {
    if (!data.length && !depts.length) return
    try {
      downloadAttendanceReportExcel(data, depts, month, year)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const empCols: ColumnDef<AttendanceReportEmployeeRow, unknown>[] = [
    { accessorKey: 'eid', header: 'ID', size: 60 },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.department && <p className="text-xs text-text-tertiary">{row.original.department}</p>}
        </div>
      ),
    },
    { accessorKey: 'totalDays', header: 'Days', size: 60 },
    {
      accessorKey: 'present',
      header: 'Present',
      size: 70,
      cell: ({ getValue }) => <span className="text-success">{getValue() as number}</span>,
    },
    {
      accessorKey: 'late',
      header: 'Late',
      size: 60,
      cell: ({ getValue }) => <span className="text-warning">{getValue() as number}</span>,
    },
    {
      accessorKey: 'absent',
      header: 'Absent',
      size: 70,
      cell: ({ getValue }) => <span className="text-danger">{getValue() as number}</span>,
    },
    { accessorKey: 'overtimeHours', header: 'OT Hrs', size: 70 },
    { accessorKey: 'totalBreakHours', header: 'Break Hrs', size: 80 },
  ]

  const deptCols: ColumnDef<AttendanceReportDeptRow, unknown>[] = [
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'employees', header: 'Employees', size: 80 },
    {
      accessorKey: 'present',
      header: 'Present',
      size: 70,
      cell: ({ getValue }) => <span className="text-success">{getValue() as number}</span>,
    },
    {
      accessorKey: 'late',
      header: 'Late',
      size: 60,
      cell: ({ getValue }) => <span className="text-warning">{getValue() as number}</span>,
    },
    {
      accessorKey: 'absent',
      header: 'Absent',
      size: 70,
      cell: ({ getValue }) => <span className="text-danger">{getValue() as number}</span>,
    },
    { accessorKey: 'overtimeHours', header: 'OT Hrs', size: 70 },
  ]

  const hasExportData = data.length > 0 || depts.length > 0

  return (
    <div className="space-y-6">
      <p className="text-xs text-text-tertiary">
        Exports use PDF and Microsoft Excel formats only (no CSV/JSON).
      </p>
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Employee</label>
          <Select value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-48">
            <option value="">All</option>
            {employees.filter((e) => e.active).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Month</label>
          <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} className="w-20" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Year</label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24" />
        </div>
        <Button onClick={generate}>Generate</Button>
        {hasExportData && (
          <>
            <Button variant="secondary" disabled={exporting !== null} onClick={() => void onExportPdf()}>
              Export PDF <Download className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="secondary" disabled={exporting !== null} onClick={onExportExcel}>
              Export Excel <Download className="h-4 w-4" aria-hidden />
            </Button>
          </>
        )}
      </div>

      {data.length > 0 && <DataTable columns={empCols} data={data} searchColumn="name" pageSize={15} />}

      {depts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Department roll-up</h3>
          <DataTable columns={deptCols} data={depts} pageSize={10} />
        </section>
      )}
    </div>
  )
}
