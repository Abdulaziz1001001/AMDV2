import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { request } from '@/api/client'
import { CheckCircle, Circle, Trash2 } from 'lucide-react'

interface ChecklistItem { _id: string; label: string; done: boolean }
interface Checklist { id: string; _id: string; employeeId: string; type: string; items: ChecklistItem[]; completedAt?: string }

export default function Onboarding() {
  const { employees } = useData()
  const { toast } = useToast()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [empId, setEmpId] = useState('')
  const [type, setType] = useState('onboarding')

  const load = async () => {
    try {
      setChecklists(await request('/onboarding'))
    } catch {
      /* ignore load errors */
    }
  }
  useEffect(() => { load() }, [])

  const generate = async () => {
    if (!empId) return toast('Select employee', 'warning')
    try { await request('/onboarding/generate', 'POST', { employeeId: empId, type }); load(); toast('Created', 'success') } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const toggle = async (clId: string, itemId: string, done: boolean) => {
    try { await request(`/onboarding/${clId}/item/${itemId}`, 'PATCH', { done }); load() } catch (e: unknown) { toast((e as Error).message, 'error') }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete?')) return
    try {
      await request(`/onboarding/${id}`, 'DELETE')
      load()
      toast('Deleted', 'warning')
    } catch {
      /* ignore delete errors */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap items-end">
        <div><label className="text-xs font-medium text-text-secondary block mb-1">Employee</label><Select value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-48"><option value="">Select...</option>{employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></div>
        <div><label className="text-xs font-medium text-text-secondary block mb-1">Type</label><Select value={type} onChange={(e) => setType(e.target.value)} className="w-40"><option value="onboarding">Onboarding</option><option value="offboarding">Offboarding</option></Select></div>
        <Button onClick={generate} size="sm">Generate</Button>
      </div>

      <div className="space-y-4">
        {checklists.map((cl) => {
          const emp = employees.find((e) => e.id === cl.employeeId)
          const done = cl.items.filter(i => i.done).length
          return (
            <Card key={cl.id || cl._id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div><p className="font-medium text-text-primary">{emp?.name || 'Employee'}</p><div className="flex gap-2 mt-1"><Badge status={cl.type === 'onboarding' ? 'present' : 'absent'} /><span className="text-xs text-text-tertiary">{done}/{cl.items.length} completed</span></div></div>
                  <Button variant="ghost" size="icon" onClick={() => remove(cl.id || cl._id)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                </div>
                <div className="space-y-1.5">
                  {cl.items.map((item) => (
                    <button key={item._id} onClick={() => toggle(cl.id || cl._id, item._id, !item.done)} className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 hover:bg-surface-raised transition-colors">
                      {item.done ? <CheckCircle className="h-4 w-4 text-success shrink-0" /> : <Circle className="h-4 w-4 text-text-tertiary shrink-0" />}
                      <span className={`text-sm ${item.done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
