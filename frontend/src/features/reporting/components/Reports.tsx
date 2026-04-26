import { useMemo, useState } from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as Popover from '@radix-ui/react-popover'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { fetchAttendanceReport } from '@/features/reporting/api/reportingApi'
import { Check, ChevronDown, Download } from 'lucide-react'
import {
  downloadAttendanceReportPdf,
  downloadAttendanceReportExcel,
  downloadMonthlyAttendanceDetailPdf,
  downloadMonthlyAttendanceDetailExcel,
  mapAttendanceReportRecordsToDetailRows,
} from '@/features/reporting/utils/reportingExport'
import type {
  AttendanceReportDeptRow,
  AttendanceReportEmployeeRow,
  AttendanceReportRecordRow,
} from '@/features/reporting/types/reporting'
import { cn } from '@/lib/cn'

export default function Reports() {
  const { employees } = useData()
  const { toast } = useToast()
  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [data, setData] = useState<AttendanceReportEmployeeRow[]>([])
  const [depts, setDepts] = useState<AttendanceReportDeptRow[]>([])
  const [detailRows, setDetailRows] = useState<AttendanceReportRecordRow[]>([])
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | 'detailPdf' | 'detailXlsx' | null>(null)

  const allSelectedImplicit = selectedIds.size === 0
  const allSelectedExplicit =
    activeEmployees.length > 0 && selectedIds.size === activeEmployees.length
  const selectionLabel =
    allSelectedImplicit || allSelectedExplicit ? 'All employees' : `${selectedIds.size} selected`

  const isEmpChecked = (id: string) =>
    allSelectedImplicit || selectedIds.has(id)

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (prev.size === 0) {
        if (!checked) {
          return new Set(activeEmployees.filter((e) => e.id !== id).map((e) => e.id))
        }
        return prev
      }
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      if (next.size === activeEmployees.length || next.size === 0) return new Set()
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set())
  }

  const generate = async () => {
    try {
      const useFilter =
        activeEmployees.length > 0 &&
        selectedIds.size > 0 &&
        selectedIds.size < activeEmployees.length
      const employeeIds = useFilter ? Array.from(selectedIds) : undefined

      const res = await fetchAttendanceReport({
        employeeIds,
        month,
        year,
      })
      setData(res.employees || [])
      setDepts(res.departments || [])
      setDetailRows(res.records || [])
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const onExportSummaryPdf = async () => {
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

  const onExportSummaryExcel = () => {
    if (!data.length && !depts.length) return
    try {
      downloadAttendanceReportExcel(data, depts, month, year)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const onExportDetailPdf = async () => {
    if (!detailRows.length) return
    setExporting('detailPdf')
    try {
      const rows = mapAttendanceReportRecordsToDetailRows(detailRows)
      await downloadMonthlyAttendanceDetailPdf(rows, month, year)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    } finally {
      setExporting(null)
    }
  }

  const onExportDetailExcel = () => {
    if (!detailRows.length) return
    try {
      const rows = mapAttendanceReportRecordsToDetailRows(detailRows)
      downloadMonthlyAttendanceDetailExcel(rows, month, year)
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

  const detailCols: ColumnDef<AttendanceReportRecordRow, unknown>[] = [
    {
      accessorKey: 'employeeName',
      header: 'Employee',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.employeeName}</p>
          {row.original.employeeEid && (
            <p className="text-xs text-text-tertiary">{row.original.employeeEid}</p>
          )}
        </div>
      ),
    },
    { accessorKey: 'date', header: 'Date', size: 96 },
    { accessorKey: 'checkIn', header: 'Check-in', size: 96 },
    { accessorKey: 'checkOut', header: 'Check-out', size: 96 },
    { accessorKey: 'locationName', header: 'In location' },
    { accessorKey: 'checkoutLocationName', header: 'Out location' },
    { accessorKey: 'status', header: 'Status', size: 88 },
    { accessorKey: 'notes', header: 'Notes' },
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

  const hasSummaryExport = data.length > 0 || depts.length > 0

  return (
    <div className="space-y-6">
      <p className="text-xs text-text-tertiary">
        Summary exports use PDF and Excel; monthly detail exports include locations and notes (early leave reasons).
      </p>

      <div className="flex flex-wrap gap-3 items-end border-b border-border-subtle pb-4">
        <Popover.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex h-9 items-center justify-between gap-2 rounded-lg border border-border px-3 text-sm',
                'bg-surface text-text-primary hover:bg-surface-elevated min-w-[200px]',
              )}
            >
              <span className="truncate">{selectionLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className={cn(
                'z-50 w-[min(100vw-2rem,320px)] rounded-lg border border-border bg-surface p-3 shadow-lg',
                'max-h-[min(70vh,360px)] overflow-y-auto',
              )}
              sideOffset={6}
              align="start"
            >
              <div className="flex gap-2 mb-3">
                <Button type="button" variant="secondary" size="sm" className="text-xs" onClick={selectAll}>
                  Select all
                </Button>
              </div>
              <ul className="space-y-1.5">
                {activeEmployees.map((e) => (
                  <li key={e.id}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary py-0.5">
                      <Checkbox.Root
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-surface',
                          'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
                        )}
                        checked={isEmpChecked(e.id)}
                        onCheckedChange={(v) => toggleOne(e.id, v === true)}
                      >
                        <Checkbox.Indicator>
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <span className="truncate">{e.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {activeEmployees.length === 0 && (
                <p className="text-xs text-text-tertiary">No active employees.</p>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Month</label>
          <Input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-20"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Year</label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24" />
        </div>

        <Button onClick={() => void generate()}>Generate</Button>

        {hasSummaryExport && (
          <>
            <Button variant="secondary" disabled={exporting !== null} onClick={() => void onExportSummaryPdf()}>
              Summary PDF <Download className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="secondary" disabled={exporting !== null} onClick={onExportSummaryExcel}>
              Summary Excel <Download className="h-4 w-4" aria-hidden />
            </Button>
          </>
        )}
        {detailRows.length > 0 && (
          <>
            <Button variant="secondary" disabled={exporting !== null} onClick={() => void onExportDetailPdf()}>
              Export PDF <Download className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="secondary" disabled={exporting !== null} onClick={onExportDetailExcel}>
              Export Excel <Download className="h-4 w-4" aria-hidden />
            </Button>
          </>
        )}
      </div>

      {detailRows.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Daily records (filtered month)</h3>
          <DataTable columns={detailCols} data={detailRows} searchColumn="employeeName" pageSize={15} />
        </section>
      )}

      {data.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Employee summary</h3>
          <DataTable columns={empCols} data={data} searchColumn="name" pageSize={15} />
        </section>
      )}

      {depts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Department roll-up</h3>
          <DataTable columns={deptCols} data={depts} pageSize={10} />
        </section>
      )}
    </div>
  )
}
