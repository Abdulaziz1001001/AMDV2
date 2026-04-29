import { useEffect, useState, useMemo } from 'react'
import { Users, UserCheck, Clock, UserX, ArrowRightLeft, Timer, AlertTriangle, CalendarCheck2, ChevronRight } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/features/core/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceChart } from '@/features/reporting/components/AttendanceChart'
import { useData } from '@/stores/DataContext'
import { useLang } from '@/stores/LangContext'
import { fetchSafetyIncidents } from '@/features/safety/api/safetyApi'
import type { SafetyIncident } from '@/features/safety/types/safety'
import {
  closeDay,
  fetchAbsenteeTriggerTime,
  fetchEarlyCheckouts,
  fetchOvertimes,
  updateAbsenteeTriggerTime,
} from '@/features/attendance/api/attendanceAdminApi'
import type { EarlyCheckout, OvertimeEntry } from '@/features/attendance/types/attendance'
import type { LeaveRequest } from '@/features/hr/types/hr'
import { useAdminNav } from '@/stores/AdminNavContext'
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

function leaveEmployeeName(l: LeaveRequest, employees: { id: string; name?: string }[]) {
  const ref = l.employeeId
  if (typeof ref === 'string') return employees.find((e) => e.id === ref)?.name || '—'
  return ref?.name || '—'
}

export default function Dashboard() {
  const { employees, records, groups, workPolicy, sync, leaveRequests } = useData()
  const {
    setActivePanel,
    goToLeaveRequest,
    goToEarlyCheckout,
    goToOvertime,
    goToSafetyIncident,
  } = useAdminNav()
  const { t } = useLang()
  const { toast } = useToast()
  const [earlyCheckouts, setEarlyCheckouts] = useState<EarlyCheckout[]>([])
  const [overtimes, setOvertimes] = useState<OvertimeEntry[]>([])
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [closeDayBusy, setCloseDayBusy] = useState(false)
  const [triggerTime, setTriggerTime] = useState('18:00')
  const [triggerTimeBusy, setTriggerTimeBusy] = useState(false)
  const [lastCloseRunDate, setLastCloseRunDate] = useState<string | null>(null)

  useEffect(() => {
    fetchEarlyCheckouts().then(setEarlyCheckouts).catch(() => {})
    fetchOvertimes().then(setOvertimes).catch(() => {})
    fetchSafetyIncidents().then(setIncidents).catch(() => {})
    fetchAbsenteeTriggerTime()
      .then((res) => setTriggerTime(res.triggerTime || '18:00'))
      .catch(() => {})
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

  const pendingLeavesList = useMemo(() => leaveRequests.filter((l) => l.status === 'pending').slice(0, 6), [leaveRequests])
  const pendingEcList = useMemo(() => earlyCheckouts.filter((e) => e.status === 'pending').slice(0, 4), [earlyCheckouts])
  const pendingOtList = useMemo(() => overtimes.filter((o) => o.status === 'pending').slice(0, 4), [overtimes])

  const firstPendingEcId = earlyCheckouts.find((e) => e.status === 'pending')?.id
  const firstPendingOtId = overtimes.find((o) => o.status === 'pending')?.id
  const firstOpenIncidentId = incidents.find((i) => i.status === 'open' || i.status === 'investigating')?.id

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

  const saveTriggerTime = async () => {
    if (triggerTimeBusy) return
    setTriggerTimeBusy(true)
    try {
      const res = await updateAbsenteeTriggerTime(triggerTime)
      setTriggerTime(res.triggerTime || triggerTime)
      toast('Absentee trigger time updated', 'success')
    } catch (e: unknown) {
      toast((e as Error).message || 'Failed to update trigger time', 'error')
    } finally {
      setTriggerTimeBusy(false)
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
        <CardContent className="pt-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-text-primary">Shift Closure Control</p>
            <p className="text-xs text-text-tertiary mt-1">
              Mark absentees for <span className="font-mono">{today}</span>. Action is guarded to avoid duplicate runs.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Absentee Trigger Time</label>
              <Input type="time" value={triggerTime} onChange={(e) => setTriggerTime(e.target.value)} className="w-36" />
            </div>
            <Button variant="secondary" onClick={() => void saveTriggerTime()} disabled={triggerTimeBusy}>
              {triggerTimeBusy ? 'Saving...' : 'Save Time'}
            </Button>
            <Button
              onClick={runCloseDay}
              disabled={closeDayBusy || alreadyClosedToday}
              className="min-w-52"
            >
              <CalendarCheck2 className="h-4 w-4" />
              {closeDayBusy ? 'Closing Day...' : alreadyClosedToday ? 'Day Already Closed' : 'Close Day / Mark Absentees'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('totalEmployees')}
          value={active.length}
          icon={Users}
          color="accent"
          onClick={() => setActivePanel('employees')}
        />
        <StatCard
          label={t('presentToday')}
          value={present}
          icon={UserCheck}
          color="success"
          onClick={() => setActivePanel('records')}
        />
        <StatCard
          label={t('lateToday')}
          value={late}
          icon={Clock}
          color="warning"
          onClick={() => setActivePanel('records')}
        />
        <StatCard
          label={t('absentToday')}
          value={absent < 0 ? 0 : absent}
          icon={UserX}
          color="danger"
          onClick={() => setActivePanel('records')}
        />
      </div>

      {(pendingEC > 0 || pendingOT > 0 || openInc > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pendingEC > 0 && (
            <StatCard
              label={t('earlyCheckouts')}
              value={pendingEC}
              icon={ArrowRightLeft}
              color="warning"
              onClick={() => { if (firstPendingEcId) goToEarlyCheckout(firstPendingEcId) }}
            />
          )}
          {pendingOT > 0 && (
            <StatCard
              label={t('pendingOvertime')}
              value={pendingOT}
              icon={Timer}
              color="accent"
              onClick={() => { if (firstPendingOtId) goToOvertime(firstPendingOtId) }}
            />
          )}
          {openInc > 0 && (
            <StatCard
              label={t('openIncidents')}
              value={openInc}
              icon={AlertTriangle}
              color="danger"
              onClick={() => { if (firstOpenIncidentId) goToSafetyIncident(firstOpenIncidentId) }}
            />
          )}
        </div>
      )}

      {(pendingLeavesList.length > 0 || pendingEcList.length > 0 || pendingOtList.length > 0) && (
        <section className="rounded-xl px-1 py-2">
          <h2 className="text-sm font-semibold text-text-primary mb-3 px-1">Pending approvals</h2>
          <div className="divide-y divide-border-subtle rounded-xl overflow-hidden bg-surface-raised/40">
            {pendingLeavesList.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => goToLeaveRequest(l.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-raised/80"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">Leave · {l.type}</p>
                  <p className="text-xs text-text-tertiary truncate">{leaveEmployeeName(l, employees)} · {l.requestedDays} day(s)</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
              </button>
            ))}
            {pendingEcList.map((ec) => {
              const name =
                typeof ec.employeeId === 'string'
                  ? employees.find((e) => e.id === ec.employeeId)?.name
                  : (ec.employeeId as { name?: string })?.name
              return (
                <button
                  key={ec.id}
                  type="button"
                  onClick={() => goToEarlyCheckout(ec.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-raised/80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">Early checkout</p>
                    <p className="text-xs text-text-tertiary truncate">{name || 'Employee'} — {ec.reason?.slice(0, 80) || '—'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
                </button>
              )
            })}
            {pendingOtList.map((ot) => {
              const name =
                typeof ot.employeeId === 'string'
                  ? employees.find((e) => e.id === ot.employeeId)?.name
                  : (ot.employeeId as { name?: string })?.name
              return (
                <button
                  key={ot.id}
                  type="button"
                  onClick={() => goToOvertime(ot.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-raised/80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">Overtime request</p>
                    <p className="text-xs text-text-tertiary truncate">{name || 'Employee'} — {ot.extraMinutes} min · {ot.date}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
                </button>
              )
            })}
          </div>
        </section>
      )}

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
