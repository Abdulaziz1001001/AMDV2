import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/api/client'
import type { EarlyCheckout, LeaveRequest, OvertimeEntry } from '@/api/admin'
import {
  fetchDepartmentLeaves,
  fetchTeamEarlyCheckouts,
  fetchTeamOvertimes,
  patchDepartmentLeave,
  approveEarlyCheckout,
  actionTeamOvertime,
} from '@/api/managerTeam'
import { fmtDate, fmtTime } from '@/lib/formatters'
import { useToast } from '@/components/ui/Toast'

function empLabel(ref: LeaveRequest['employeeId']): string {
  if (!ref) return '—'
  if (typeof ref === 'string') return ref
  return [ref.name, ref.eid].filter(Boolean).join(' · ') || '—'
}

function ecEmp(ref: EarlyCheckout['employeeId']): string {
  if (!ref) return '—'
  if (typeof ref === 'string') return ref
  return [ref.name, ref.eid].filter(Boolean).join(' · ') || '—'
}

function otEmp(ref: OvertimeEntry['employeeId']): string {
  if (!ref) return '—'
  if (typeof ref === 'string') return ref
  return [ref.name, ref.eid].filter(Boolean).join(' · ') || '—'
}

export default function TeamPanel() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [noDepartment, setNoDepartment] = useState(false)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [checkouts, setCheckouts] = useState<EarlyCheckout[]>([])
  const [overtimes, setOvertimes] = useState<OvertimeEntry[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    setNoDepartment(false)
    try {
      const [l, ec, ot] = await Promise.all([
        fetchDepartmentLeaves().catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) {
            setNoDepartment(true)
            return [] as LeaveRequest[]
          }
          throw e
        }),
        fetchTeamEarlyCheckouts(),
        fetchTeamOvertimes(),
      ])
      setLeaves(Array.isArray(l) ? l : [])
      setCheckouts(ec)
      setOvertimes(ot)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  const pendingLeaves = useMemo(() => leaves.filter((x) => x.status === 'pending'), [leaves])
  const pendingEc = useMemo(() => checkouts.filter((x) => x.status === 'pending'), [checkouts])
  const pendingOt = useMemo(() => overtimes.filter((x) => x.status === 'pending'), [overtimes])

  const actLeave = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await patchDepartmentLeave(id, status)
      await refresh()
      toast(`Leave ${status === 'approved' ? 'approved' : 'declined'}`, 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const actEc = async (id: string, status: 'approved' | 'declined') => {
    try {
      await approveEarlyCheckout(id, status)
      await refresh()
      toast(`Checkout ${status}`, 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const actOt = async (id: string, status: 'approved' | 'declined') => {
    try {
      await actionTeamOvertime(id, status)
      await refresh()
      toast(`Overtime ${status}`, 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  if (!initialized && loading) {
    return (
      <div className="rounded-2xl bg-surface-raised/60 px-5 py-12 text-center text-sm text-text-secondary">
        Loading team requests…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {noDepartment && (
        <div className="rounded-2xl bg-surface-raised/80 px-4 py-3 text-sm text-text-secondary">
          No department is assigned to you as manager. Leave approvals from this tab are unavailable; other lists still
          reflect your access.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Pending leave requests</h2>
        <div className="rounded-2xl bg-surface p-1">
          {pendingLeaves.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">No pending leave requests.</p>
          ) : (
            <ul className="divide-y divide-border-subtle/60">
              {pendingLeaves.map((row) => (
                <li key={row.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-text-primary">{empLabel(row.employeeId)}</p>
                    <p className="text-sm text-text-secondary">
                      {row.type} · {fmtDate(row.startDate)} – {fmtDate(row.endDate)} · {row.requestedDays} day(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="approval" size="sm" onClick={() => actLeave(row.id, 'approved')}>
                      Approve
                    </Button>
                    <Button variant="decline" size="sm" onClick={() => actLeave(row.id, 'rejected')}>
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Pending early checkouts</h2>
        <div className="rounded-2xl bg-surface p-1">
          {pendingEc.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">No pending early checkouts.</p>
          ) : (
            <ul className="divide-y divide-border-subtle/60">
              {pendingEc.map((row) => (
                <li key={row.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-text-primary">{ecEmp(row.employeeId)}</p>
                    <p className="text-sm text-text-secondary">
                      {fmtTime(row.checkoutTime)}
                      {row.reason ? ` · ${row.reason}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="approval" size="sm" onClick={() => actEc(row.id, 'approved')}>
                      Approve
                    </Button>
                    <Button variant="decline" size="sm" onClick={() => actEc(row.id, 'declined')}>
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Pending overtime</h2>
        <div className="rounded-2xl bg-surface p-1">
          {pendingOt.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">No pending overtime requests.</p>
          ) : (
            <ul className="divide-y divide-border-subtle/60">
              {pendingOt.map((row) => (
                <li key={row.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-text-primary">{otEmp(row.employeeId)}</p>
                    <p className="text-sm text-text-secondary">
                      {fmtDate(row.date)} · {row.extraMinutes} min
                      {row.reason ? ` · ${row.reason}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="approval" size="sm" onClick={() => actOt(row.id, 'approved')}>
                      Approve
                    </Button>
                    <Button variant="decline" size="sm" onClick={() => actOt(row.id, 'declined')}>
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
