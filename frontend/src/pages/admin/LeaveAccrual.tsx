import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { request } from '@/api/client'

interface Balance { employeeId: string; name: string; eid?: string; department?: string; allowed: number; used: number; balance: number; accrued: number }

export default function LeaveAccrual() {
  const { toast } = useToast()
  const [balances, setBalances] = useState<Balance[]>([])
  const [running, setRunning] = useState(false)

  const load = async () => { try { setBalances(await request('/leave-accrual/balances')) } catch {} }
  useEffect(() => { load() }, [])

  const runAccrual = async () => {
    setRunning(true)
    try { const res = await request<{ msg: string }>('/leave-accrual/run-accrual', 'POST'); toast(res.msg, 'success'); load() } catch (e: unknown) { toast((e as Error).message, 'error') }
    setRunning(false)
  }

  const columns: ColumnDef<Balance, unknown>[] = [
    { accessorKey: 'eid', header: 'ID', size: 60 },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'department', header: 'Department', cell: ({ getValue }) => <span className="text-text-secondary">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'allowed', header: 'Allowed', size: 80 },
    { accessorKey: 'used', header: 'Used', size: 80, cell: ({ getValue }) => <span className="text-danger">{getValue() as number}</span> },
    { accessorKey: 'balance', header: 'Balance', size: 80, cell: ({ getValue }) => {
      const v = getValue() as number
      return <span className={v < 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>{v}</span>
    }},
    { accessorKey: 'accrued', header: 'Accrued', size: 80 },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={runAccrual} disabled={running}>{running ? 'Running...' : 'Run Monthly Accrual'}</Button></div>
      <DataTable columns={columns} data={balances} searchColumn="name" searchPlaceholder="Search employee..." pageSize={15} />
    </div>
  )
}
