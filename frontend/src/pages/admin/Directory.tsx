import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { request } from '@/api/client'
import { List, GitBranch } from 'lucide-react'

interface DirEntry { id: string; name: string; eid?: string; jobTitle?: string; department?: string; email?: string; phone?: string }
interface OrgNode { name: string; role?: string; children?: OrgNode[] }

export default function Directory() {
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [orgData, setOrgData] = useState<OrgNode | null>(null)
  const [view, setView] = useState<'list' | 'org'>('list')

  useEffect(() => {
    request<DirEntry[]>('/directory').then(setEntries).catch(() => {})
    request<OrgNode>('/directory/org-chart').then(setOrgData).catch(() => {})
  }, [])

  const columns: ColumnDef<DirEntry, unknown>[] = [
    { accessorKey: 'eid', header: 'ID', size: 60 },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div><p className="font-medium text-text-primary">{row.original.name}</p><p className="text-xs text-text-tertiary">{row.original.jobTitle || ''}</p></div> },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => <span className="text-text-secondary">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => <span className="text-text-secondary">{(getValue() as string) || '—'}</span> },
  ]

  const renderOrgNode = (node: OrgNode, depth = 0): React.ReactNode => (
    <div key={node.name} style={{ marginLeft: depth * 24 }} className="py-1.5">
      <div className="flex items-center gap-2">
        {depth > 0 && <div className="w-4 border-t border-border" />}
        <div className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-sm">
          <span className="font-medium text-text-primary">{node.name}</span>
          {node.role && <span className="text-text-tertiary ml-1.5 text-xs">({node.role})</span>}
        </div>
      </div>
      {node.children?.map((child) => renderOrgNode(child, depth + 1))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <Button variant={view === 'list' ? 'default' : 'secondary'} size="sm" onClick={() => setView('list')}><List className="h-4 w-4" /> List</Button>
        <Button variant={view === 'org' ? 'default' : 'secondary'} size="sm" onClick={() => setView('org')}><GitBranch className="h-4 w-4" /> Org Chart</Button>
      </div>

      {view === 'list' ? (
        <DataTable columns={columns} data={entries} searchColumn="name" searchPlaceholder="Search directory..." />
      ) : (
        <Card>
          <CardHeader><CardTitle>Organization Chart</CardTitle></CardHeader>
          <CardContent>{orgData ? renderOrgNode(orgData) : <p className="text-text-tertiary text-sm">No data</p>}</CardContent>
        </Card>
      )}
    </div>
  )
}
