import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useData } from '@/stores/DataContext'
import { useToast } from '@/components/ui/Toast'
import { useLang } from '@/stores/LangContext'
import { request } from '@/api/client'
import { updateWorkPolicy } from '@/api/admin'
import { CheckCircle, Circle, Trash2, Plus, Pencil } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ChecklistItem {
  _id: string
  label: string
  done: boolean
}
interface Checklist {
  id: string
  _id: string
  employeeId: string
  type: string
  items: ChecklistItem[]
  completedAt?: string
}

const DEFAULT_ONBOARDING = [
  'ID Verification',
  'Safety Orientation',
  'PPE Issued',
  'Contract Signed',
  'Bank Details Collected',
]
const DEFAULT_OFFBOARDING = ['Final Settlement', 'Asset Return', 'Access Revocation', 'Exit Interview']

export default function Onboarding() {
  const { employees, workPolicy, sync } = useData()
  const { toast } = useToast()
  const { t } = useLang()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [empId, setEmpId] = useState('')
  const [type, setType] = useState('onboarding')
  const [editTemplates, setEditTemplates] = useState(false)
  const [templateTab, setTemplateTab] = useState<'onboarding' | 'offboarding'>('onboarding')
  const [onboardingTemplate, setOnboardingTemplate] = useState<string[]>([])
  const [offboardingTemplate, setOffboardingTemplate] = useState<string[]>([])
  const [savingTemplates, setSavingTemplates] = useState(false)

  const load = async () => {
    try {
      setChecklists(await request<Checklist[]>('/onboarding'))
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setOnboardingTemplate(
      workPolicy?.onboardingItems?.length ? [...workPolicy.onboardingItems] : [...DEFAULT_ONBOARDING],
    )
    setOffboardingTemplate(
      workPolicy?.offboardingItems?.length ? [...workPolicy.offboardingItems] : [...DEFAULT_OFFBOARDING],
    )
  }, [workPolicy])

  const activeTemplate = templateTab === 'onboarding' ? onboardingTemplate : offboardingTemplate
  const setActiveTemplate = templateTab === 'onboarding' ? setOnboardingTemplate : setOffboardingTemplate

  const saveTemplates = async () => {
    const ob = onboardingTemplate.map((s) => s.trim()).filter(Boolean)
    const of = offboardingTemplate.map((s) => s.trim()).filter(Boolean)
    if (ob.length === 0 || of.length === 0) {
      toast(t('templateListInvalid'), 'warning')
      return
    }
    setSavingTemplates(true)
    try {
      await updateWorkPolicy({ onboardingItems: ob, offboardingItems: of })
      await sync()
      toast(t('settingsSaved'), 'success')
      setEditTemplates(false)
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
    setSavingTemplates(false)
  }

  const generate = async () => {
    if (!empId) {
      toast(t('selectEmployee'), 'warning')
      return
    }
    try {
      await request('/onboarding/generate', 'POST', { employeeId: empId, type })
      await load()
      toast(t('checklistCreated'), 'success')
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const toggle = async (clId: string, itemId: string, done: boolean) => {
    try {
      await request(`/onboarding/${clId}/item/${itemId}`, 'PATCH', { done })
      await load()
    } catch (e: unknown) {
      toast((e as Error).message, 'error')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm(t('delete'))) return
    try {
      await request(`/onboarding/${id}`, 'DELETE')
      await load()
      toast(t('checklistRemoved'), 'warning')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-10">
      <section
        className={cn(
          'rounded-2xl border-0 bg-slate-50 px-6 py-8 shadow-none dark:bg-slate-900/90',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">{t('checklistTemplates')}</h2>
            <p className="mt-1 text-xs text-text-tertiary">
              {templateTab === 'onboarding' ? t('templateOnboardingHint') : t('templateOffboardingHint')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={templateTab}
              onChange={(e) => setTemplateTab(e.target.value as 'onboarding' | 'offboarding')}
              className="w-44"
              disabled={editTemplates}
            >
              <option value="onboarding">{t('onboardingProgram')}</option>
              <option value="offboarding">{t('offboardingProgram')}</option>
            </Select>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditTemplates((e) => !e)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {editTemplates ? t('doneEditingTemplates') : t('editChecklistTemplates')}
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {editTemplates ? (
            <>
              {activeTemplate.map((label, idx) => (
                <div key={`${templateTab}-${idx}`} className="flex gap-2">
                  <Input
                    value={label}
                    onChange={(e) => {
                      const next = [...activeTemplate]
                      next[idx] = e.target.value
                      setActiveTemplate(next)
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveTemplate(activeTemplate.filter((_, i) => i !== idx))}
                    aria-label={t('delete')}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setActiveTemplate([...activeTemplate, ''])}
              >
                <Plus className="h-4 w-4" /> {t('addTask')}
              </Button>
              <div className="pt-4">
                <Button type="button" onClick={() => void saveTemplates()} disabled={savingTemplates}>
                  {savingTemplates ? t('savingTemplates') : t('saveTemplates')}
                </Button>
              </div>
            </>
          ) : (
            <ul className="space-y-2 text-sm text-text-secondary">
              {activeTemplate.map((label, idx) => (
                <li key={`${templateTab}-v-${idx}`} className="rounded-lg px-3 py-2 dark:bg-slate-800/50">
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">{t('employees')}</label>
          <Select value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-48">
            <option value="">{t('selectEmployee')}</option>
            {employees
              .filter((e) => e.active)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">{t('checklistType')}</label>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40">
            <option value="onboarding">{t('onboardingProgram')}</option>
            <option value="offboarding">{t('offboardingProgram')}</option>
          </Select>
        </div>
        <Button type="button" onClick={() => void generate()} size="sm">
          {t('create')}
        </Button>
      </div>

      <div className="space-y-4">
        {checklists.map((cl) => {
          const emp = employees.find((e) => e.id === cl.employeeId)
          const done = cl.items.filter((i) => i.done).length
          const typeLabel = cl.type === 'onboarding' ? t('onboardingProgram') : t('offboardingProgram')
          return (
            <Card key={cl.id || cl._id} className="border-0 bg-slate-50 shadow-none dark:bg-slate-900/80">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{emp?.name || t('employees')}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-text-secondary">{typeLabel}</span>
                      <span className="text-xs text-text-tertiary">
                        {done}/{cl.items.length}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" type="button" onClick={() => remove(cl.id || cl._id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {cl.items.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => toggle(cl.id || cl._id, item._id, !item.done)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-raised"
                    >
                      {item.done ? (
                        <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-text-tertiary" />
                      )}
                      <span className={`text-sm ${item.done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                        {item.label}
                      </span>
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
