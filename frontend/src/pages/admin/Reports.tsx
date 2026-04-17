import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { fetchAttendanceReport } from '@/api/admin'
import { Download, Eye } from 'lucide-react'

interface ReportRow { employeeId: string; name: string; eid: string; department?: string; totalDays: number; present: number; late: number; absent: number; onLeave: number; overtimeHours: number; totalBreakHours: number }
interface DeptRow { department: string; employees: number; present: number; late: number; absent: number; overtimeHours: number }

export default function Reports() {
  const { employees } = useData()
  const { toast } = useToast()
  const [empId, setEmpId] = useState('')
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [data, setData] = useState<ReportRow[]>([])
  const [depts, setDepts] = useState<DeptRow[]>([])

  const generate = async () => {
    try {
      const res = await fetchAttendanceReport({ employeeId: empId || undefined, month, year })
      const r = res as { employees?: ReportRow[]; departments?: DeptRow[] }
      setData(r.employees || (Array.isArray(res) ? res as ReportRow[] : []))
      setDepts(r.departments || [])
    } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const exportCSV = () => {
    if (!data.length) return
    const lines = ['ID,Name,Department,Days,Present,Late,Absent,Leave,OT Hours,Break Hours']
    data.forEach((r) => lines.push(`${r.eid},"${r.name}",${r.department || ''},${r.totalDays},${r.present},${r.late},${r.absent},${r.onLeave},${r.overtimeHours},${r.totalBreakHours}`))
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report-${year}-${month}.csv`; a.click()
  }

  const exportDeptCSV = () => {
    if (!depts.length) return
    const lines = ['Department,Employees,Present,Late,Absent,OT Hours']
    depts.forEach((d) => lines.push(`"${d.department}",${d.employees},${d.present},${d.late},${d.absent},${d.overtimeHours}`))
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dept-rollup-${year}-${month}.csv`; a.click()
  }

  const exportJSON = () => {
    if (!data.length && !depts.length) return
    const payload = {
      generatedAt: new Date().toISOString(),
      month,
      year,
      employeeReport: data,
      departmentRollup: depts,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance-report-${year}-${month}.json`; a.click()
  }

  const empCols: ColumnDef<ReportRow, unknown>[] = [
    { accessorKey: 'eid', header: 'ID', size: 60 },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p>{row.original.department && <p className="text-xs text-text-tertiary">{row.original.department}</p>}</div> },
    { accessorKey: 'totalDays', header: 'Days', size: 60 },
    { accessorKey: 'present', header: 'Present', size: 70, cell: ({ getValue }) => <span className="text-success">{getValue() as number}</span> },
    { accessorKey: 'late', header: 'Late', size: 60, cell: ({ getValue }) => <span className="text-warning">{getValue() as number}</span> },
    { accessorKey: 'absent', header: 'Absent', size: 70, cell: ({ getValue }) => <span className="text-danger">{getValue() as number}</span> },
    { accessorKey: 'overtimeHours', header: 'OT Hrs', size: 70 },
    { accessorKey: 'totalBreakHours', header: 'Break Hrs', size: 80 },
  ]

  const deptCols: ColumnDef<DeptRow, unknown>[] = [
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'employees', header: 'Employees', size: 80 },
    { accessorKey: 'present', header: 'Present', size: 70, cell: ({ getValue }) => <span className="text-success">{getValue() as number}</span> },
    { accessorKey: 'late', header: 'Late', size: 60, cell: ({ getValue }) => <span className="text-warning">{getValue() as number}</span> },
    { accessorKey: 'absent', header: 'Absent', size: 70, cell: ({ getValue }) => <span className="text-danger">{getValue() as number}</span> },
    { accessorKey: 'overtimeHours', header: 'OT Hrs', size: 70 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap items-end">
        <div><label className="text-xs font-medium text-text-secondary block mb-1">Employee</label><Select value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-48"><option value="">All</option>{employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></div>
        <div><label className="text-xs font-medium text-text-secondary block mb-1">Month</label><Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} className="w-20" /></div>
        <div><label className="text-xs font-medium text-text-secondary block mb-1">Year</label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24" /></div>
        <Button onClick={generate}>Generate</Button>
        {data.length > 0 && <Button variant="secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Employee CSV</Button>}
        {depts.length > 0 && <Button variant="secondary" onClick={exportDeptCSV}><Download className="h-4 w-4" /> Dept CSV</Button>}
        {(data.length > 0 || depts.length > 0) && <Button variant="secondary" onClick={exportJSON}><Eye className="h-4 w-4" /> JSON</Button>}
      </div>

      {data.length > 0 && <DataTable columns={empCols} data={data} searchColumn="name" pageSize={15} />}

      {depts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Department Roll-Up</CardTitle></CardHeader>
          <CardContent><DataTable columns={deptCols} data={depts} pageSize={10} /></CardContent>
        </Card>
      )}
    </div>
  )
}
