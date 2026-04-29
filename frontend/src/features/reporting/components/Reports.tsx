import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { addDays, endOfMonth, endOfYear, format, startOfMonth, startOfYear } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { useReports } from '@/features/reports/hooks/useReports'
import { Download } from 'lucide-react'
import {
  downloadMonthlyAttendanceDetailPdf,
  downloadMonthlyAttendanceDetailExcel,
  mapAttendanceReportRecordsToDetailRows,
} from '@/features/reporting/utils/reportingExport'
import type { MonthlyAttendanceDetailRow, ReportRecordRow } from '@/features/reporting/types/reporting'
import { cn } from '@/lib/cn'
import { fmtTime } from '@/lib/formatters'

type ReportPreset = 'day' | 'month' | 'year' | 'custom'
const REPORT_TIMEZONE = 'Asia/Riyadh'

function formatYmd(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function getPresetRange(preset: ReportPreset) {
  const nowInRiyadh = toZonedTime(new Date(), REPORT_TIMEZONE)
  if (preset === 'day') {
    return {
      startDate: formatYmd(nowInRiyadh),
      endDate: formatYmd(addDays(nowInRiyadh, 1)),
    }
  }
  if (preset === 'year') {
    return {
      startDate: formatYmd(startOfYear(nowInRiyadh)),
      endDate: formatYmd(endOfYear(nowInRiyadh)),
    }
  }
  return {
    startDate: formatYmd(startOfMonth(nowInRiyadh)),
    endDate: formatYmd(endOfMonth(nowInRiyadh)),
  }
}

export default function Reports() {
  const { employees } = useData()
  const { toast } = useToast()
  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees])
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [preset, setPreset] = useState<ReportPreset>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [exporting, setExporting] = useState<'detailPdf' | 'detailXlsx' | null>(null)
  const [displayedRows, setDisplayedRows] = useState<Array<ReportRecordRow & { employeeName: string; employeeEid: string }>>([])

  const reportRange = useMemo(() => {
    if (preset === 'custom') {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    }
    return getPresetRange(preset)
  }, [preset, customStartDate, customEndDate])

  const reportsQuery = useReports(
    reportRange.startDate,
    reportRange.endDate,
    employeeFilter === 'all' ? undefined : employeeFilter,
  )
  const reportRows = useMemo(() => {
    const records = reportsQuery.data || []
    return records.map((record: ReportRecordRow) => {
      const employee = record.employee || employeeById.get(record.employeeId)
      return {
        ...record,
        employeeName: employee?.name || 'Unknown',
        employeeEid: employee?.eid || '—',
      }
    })
  }, [reportsQuery.data, employeeById])

  const exportRows = useMemo<MonthlyAttendanceDetailRow[]>(() => {
    return mapAttendanceReportRecordsToDetailRows(
      displayedRows.map((record) => ({
        employeeName: record.employeeName,
        date: record.date,
        checkIn: record.checkIn || '',
        checkOut: record.checkOut || '',
        locationName: record.locationName || '',
        checkoutLocationName: record.checkoutLocation || record.checkoutLocationName || '',
        status: record.status,
        notes: record.notes || '',
      })),
    )
  }, [displayedRows])

  const onExportDetailPdf = async () => {
    if (!exportRows.length) return
    setExporting('detailPdf')
    try {
      await downloadMonthlyAttendanceDetailPdf(exportRows, reportRange.startDate, reportRange.endDate)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    } finally {
      setExporting(null)
    }
  }

  const onExportDetailExcel = () => {
    if (!exportRows.length) return
    try {
      downloadMonthlyAttendanceDetailExcel(exportRows, reportRange.startDate, reportRange.endDate)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const reportCols: ColumnDef<(typeof reportRows)[0], unknown>[] = [
    {
      accessorKey: 'employeeName',
      header: 'Employee',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.employeeName}</p>
          <p className="text-xs text-text-tertiary">{row.original.employeeEid}</p>
        </div>
      ),
    },
    { accessorKey: 'date', header: 'Date', size: 96 },
    { accessorKey: 'checkIn', header: 'Check-in', size: 96, cell: ({ row }) => fmtTime(row.original.checkIn) },
    { accessorKey: 'checkOut', header: 'Check-out', size: 96, cell: ({ row }) => fmtTime(row.original.checkOut) },
    { accessorKey: 'status', header: 'Status', size: 88 },
    { accessorKey: 'locationName', header: 'In location' },
    { accessorKey: 'checkoutLocation', header: 'Checkout location', cell: ({ row }) => row.original.checkoutLocation || row.original.checkoutLocationName || '—' },
    { accessorKey: 'notes', header: 'Notes', cell: ({ getValue }) => (getValue() as string) || '—' },
  ]

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-sunken/60 p-1">
          {([
            { id: 'day', label: 'Day' },
            { id: 'month', label: 'Month' },
            { id: 'year', label: 'Year' },
            { id: 'custom', label: 'Custom Range' },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                preset === item.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Start Date</label>
              <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-44" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">End Date</label>
              <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-44" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-text-tertiary">
            Showing records from {reportRange.startDate || '—'} to {reportRange.endDate || '—'} (Asia/Riyadh)
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-secondary">Employee</label>
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              className="h-9 min-w-44 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary"
            >
              <option value="all">All employees</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            {reportsQuery.isFetching && <p className="text-xs text-text-tertiary">Refreshing...</p>}
          </div>
        </div>

        <DataTable
          columns={reportCols}
          data={reportRows}
          searchColumn="employeeName"
          pageSize={15}
          frameless
          onDisplayedRowsChange={setDisplayedRows}
        />
      </section>

      <div className="flex flex-wrap gap-3 items-end border-b border-border-subtle pb-4">
        {exportRows.length > 0 && (
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
    </div>
  )
}
