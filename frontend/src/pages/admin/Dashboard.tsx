import { useEffect, useState, useMemo } from 'react'
import { Users, UserCheck, Clock, UserX, ArrowRightLeft, Timer, AlertTriangle, CalendarCheck2 } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceChart } from '@/components/charts/AttendanceChart'
import { useData } from '@/stores/DataContext'
import { useLang } from '@/stores/LangContext'
import { closeDay, fetchEarlyCheckouts, fetchOvertimes, fetchSafetyIncidents, type EarlyCheckout, type OvertimeEntry, type SafetyIncident } from '@/api/admin'
import { isWorkingDay } from '@/lib/calendar'
import { todayStr, fmtTime } from '@/lib/formatters'
import { useToast } from '@/components/ui/Toast'

interface TodayRow {
  id: string
  name: string
  eid: string
  checkIn: string
  checkOut: string
  status: string
}

export default function Dashboard() {
  const { employees, records, groups, workPolicy, sync } = useData()
  const { t } = useLang()
  const { toast } = useToast()
  const [earlyCheckouts, setEarlyCheckouts] = useState<EarlyCheckout[]>([])
  const [overtimes, setOvertimes] = useState<OvertimeEntry[]>([])
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [closeDayBusy, setCloseDayBusy] = useState(false)
  const [lastCloseRunDate, setLastCloseRunDate] = useState<string | null>(null)

  useEffect(() => {
    fetchEarlyCheckouts().then(setEarlyCheckouts).catch(() => {})
    fetchOvertimes().then(setOvertimes).catch(() => {})
    fetchSafetyIncidents().then(setIncidents).catch(() => {})
  }, [])

  const today = todayStr()
  const active = employees.filter((e) => e.active)
  const expected = active.filter((e) => isWorkingDay(today, e.groupId, groups, workPolicy))
  const todayRecs = records.filter((r) => r.date === today)
  const present = todayRecs.filter((r) => ['present', 'late', 'early_leave'].includes(r.status)).length
  const late = todayRecs.filter((r) => r.status === 'late').length
  const absent = expected.length - present

  const pendingEC = earlyCheckouts.filter((e) => e.status === 'pending').length
  const pendingOT = overtimes.filter((o) => o.status === 'pending').length
  const openInc = incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length
  const alreadyClosedToday = lastCloseRunDate === today

  const runCloseDay = async () => {
    if (closeDayBusy || alreadyClosedToday) return
    setCloseDayBusy(true)
    try {
      const res = await closeDay(today) as { msg?: string; count?: number }
      setLastCloseRunDate(today)
      await sync()
      toast(res.msg || `Day closed for ${today}`, 'success')
    } catch (e: unknown) {
      toast((e as Error).message || 'Failed to close day', 'error')
    } finally {
      setCloseDayBusy(false)
    }
  }

  const todayRows = useMemo<TodayRow[]>(() => {
    return todayRecs.map((r) => {
      const emp = employees.find((e) => e.id === r.employeeId)
      return {
        id: r.id,
        name: emp?.name || 'Unknown',
        eid: emp?.eid || '—',
        checkIn: fmtTime(r.checkIn),
        checkOut: fmtTime(r.checkOut),
        status: r.status,
      }
    })
  }, [todayRecs, employees])

  const columns: ColumnDef<TodayRow, unknown>[] = [
    { accessorKey: 'eid', header: 'ID', size: 60 },
    { accessorKey: 'name', header: t('name') },
    { accessorKey: 'checkIn', header: t('checkIn') },
    { accessorKey: 'checkOut', header: t('checkOut') },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ getValue }) => <Badge status={getValue() as string} />,
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="border-border bg-surface-raised/70">
        <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-text-primary">Shift Closure Control</p>
            <p className="text-xs text-text-tertiary mt-1">
              Mark absentees for <span className="font-mono">{today}</span>. Action is guarded to avoid duplicate runs.
            </p>
          </div>
          <Button
            onClick={runCloseDay}
            disabled={closeDayBusy || alreadyClosedToday}
            className="min-w-52"
          >
            <CalendarCheck2 className="h-4 w-4" />
            {closeDayBusy ? 'Closing Day...' : alreadyClosedToday ? 'Day Already Closed' : 'Close Day / Mark Absentees'}
          </Button>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('totalEmployees')} value={active.length} icon={Users} color="accent" />
        <StatCard label={t('presentToday')} value={present} icon={UserCheck} color="success" />
        <StatCard label={t('lateToday')} value={late} icon={Clock} color="warning" />
        <StatCard label={t('absentToday')} value={absent < 0 ? 0 : absent} icon={UserX} color="danger" />
      </div>

      {/* Action widgets */}
      {(pendingEC > 0 || pendingOT > 0 || openInc > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pendingEC > 0 && (
            <StatCard label={t('earlyCheckouts')} value={pendingEC} icon={ArrowRightLeft} color="warning" />
          )}
          {pendingOT > 0 && (
            <StatCard label={t('pendingOvertime')} value={pendingOT} icon={Timer} color="accent" />
          )}
          {openInc > 0 && (
            <StatCard label={t('openIncidents')} value={openInc} icon={AlertTriangle} color="danger" />
          )}
        </div>
      )}

      {/* Chart + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AttendanceChart records={records} />

        <Card>
          <CardHeader>
            <CardTitle>{t('todayAttendance')}</CardTitle>
          </CardHeader>
          <CardContent>
            {todayRows.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No records"
                description="No attendance records have been captured for today yet."
              />
            ) : (
              <DataTable columns={columns} data={todayRows} searchColumn="name" searchPlaceholder={`${t('search')}...`} pageSize={8} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
