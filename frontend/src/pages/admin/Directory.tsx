import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { useData } from '@/stores/DataContext'
import { useLang } from '@/stores/LangContext'
import { List, GitBranch } from 'lucide-react'
import { cn } from '@/lib/cn'
import { buildOrgTree, type OrgTreeNode } from '@/lib/buildOrgTree'

interface DirEntry {
  id: string
  name: string
  eid?: string
  jobTitle?: string
  department?: string
  email?: string
  phone?: string
}

function PersonOrgCard({ node }: { node: OrgTreeNode }) {
  const initial = (node.name?.[0] || '?').toUpperCase()
  return (
    <div className="inline-flex max-w-[220px] flex-col rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/90 dark:bg-slate-800/90 dark:ring-white/10">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-text-primary ring-1 ring-slate-200 dark:bg-slate-700 dark:text-white dark:ring-slate-600">
          {node.photoUrl ? (
            <img src={node.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{node.name}</p>
          {node.subtitle ? <p className="mt-0.5 truncate text-xs text-text-tertiary">{node.subtitle}</p> : null}
        </div>
      </div>
    </div>
  )
}

function OrgSubtree({ node, t }: { node: OrgTreeNode; t: (key: string) => string }) {
  const heading =
    node.name === '__UNASSIGNED__'
      ? t('orgUnassigned')
      : node.name === '__ROOT__'
        ? ''
        : node.name

  if (node.isDepartment) {
    return (
      <section className="space-y-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{heading}</h3>
        <div className="space-y-6 border-l border-slate-200/90 pl-6 dark:border-slate-700/80">
          {node.children.map((ch) => (
            <OrgSubtree key={ch.id} node={ch} t={t} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="relative space-y-4">
      <PersonOrgCard node={node} />
      {node.children.length > 0 && (
        <div className="ml-3 space-y-4 border-l border-slate-200/90 pl-6 pt-2 dark:border-slate-700/80">
          {node.children.map((ch) => (
            <OrgSubtree key={ch.id} node={ch} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Directory() {
  const { employees, departments } = useData()
  const { t } = useLang()
  const [view, setView] = useState<'list' | 'org'>('list')

  const entries: DirEntry[] = useMemo(() => {
    const deptName = (id?: string) => {
      if (!id) return ''
      const d = departments.find((x) => x.id === String(id))
      return d?.name || ''
    }
    return employees
      .filter((e) => e.active)
      .map((e) => ({
        id: e.id,
        name: e.name,
        eid: e.eid,
        jobTitle: e.jobTitle,
        department: deptName(e.departmentId),
        email: e.email,
        phone: e.phone,
      }))
  }, [employees, departments])

  const orgTree = useMemo(() => buildOrgTree(employees, departments), [employees, departments])

  const columns: ColumnDef<DirEntry, unknown>[] = useMemo(
    () => [
      { accessorKey: 'eid', header: t('empIdShort'), size: 60 },
      {
        accessorKey: 'name',
        header: t('name'),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-text-primary">{row.original.name}</p>
            <p className="text-xs text-text-tertiary">{row.original.jobTitle || ''}</p>
          </div>
        ),
      },
      { accessorKey: 'department', header: t('department') },
      {
        accessorKey: 'email',
        header: t('email'),
        cell: ({ getValue }) => <span className="text-text-secondary">{(getValue() as string) || '—'}</span>,
      },
      {
        accessorKey: 'phone',
        header: t('phone'),
        cell: ({ getValue }) => <span className="text-text-secondary">{(getValue() as string) || '—'}</span>,
      },
    ],
    [t],
  )

  const panelClass = 'rounded-2xl bg-slate-50 px-6 py-8 dark:bg-slate-900/90'

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={view === 'list' ? 'default' : 'secondary'} size="sm" type="button" onClick={() => setView('list')}>
          <List className="mr-2 h-4 w-4" /> {t('directoryListView')}
        </Button>
        <Button variant={view === 'org' ? 'default' : 'secondary'} size="sm" type="button" onClick={() => setView('org')}>
          <GitBranch className="mr-2 h-4 w-4" /> {t('directoryOrgView')}
        </Button>
      </div>

      {view === 'list' ? (
        <DataTable columns={columns} data={entries} searchColumn="name" searchPlaceholder={t('searchDirectory')} />
      ) : (
        <div className={cn(panelClass)}>
          <h2 className="mb-8 text-sm font-semibold tracking-tight text-text-primary">{t('organizationChart')}</h2>
          <div className="space-y-10">
            {orgTree.children.map((child) => (
              <OrgSubtree key={child.id} node={child} t={t} />
            ))}
          </div>
          {orgTree.children.length === 0 && <p className="text-sm text-text-tertiary">{t('noData')}</p>}
        </div>
      )}
    </div>
  )
}
