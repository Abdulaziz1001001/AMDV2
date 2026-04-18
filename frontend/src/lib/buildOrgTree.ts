import type { Department, Employee } from '@/api/admin'

export interface OrgTreeNode {
  id: string
  name: string
  subtitle?: string
  photoUrl?: string
  isDepartment?: boolean
  children: OrgTreeNode[]
}

function managerIdStr(d: Department): string | undefined {
  const m = d.managerId
  if (!m) return undefined
  if (typeof m === 'string') return m
  return m.id
}

function employeeCard(e: Employee): OrgTreeNode {
  return {
    id: e.id,
    name: e.name,
    subtitle: e.jobTitle || '',
    photoUrl: e.photoUrl,
    children: [],
  }
}

/** Builds a hierarchy from employees + departments using departmentId and managerId. */
export function buildOrgTree(employees: Employee[], departments: Department[]): OrgTreeNode {
  const active = employees.filter((e) => e.active !== false)
  const byId = new Map(active.map((e) => [e.id, e]))

  const deptChildren: OrgTreeNode[] = departments.map((dept) => {
    const mgrId = managerIdStr(dept)
    const inDept = active.filter((e) => e.departmentId && String(e.departmentId) === String(dept.id))
    const mgr = mgrId ? byId.get(mgrId) : undefined
    const staff = mgr ? inDept.filter((e) => e.id !== mgrId) : inDept

    let inner: OrgTreeNode[]
    if (mgr) {
      inner = [{ ...employeeCard(mgr), children: staff.map(employeeCard) }]
    } else {
      inner = staff.map(employeeCard)
    }

    return {
      id: `dept-${dept.id}`,
      name: dept.name,
      isDepartment: true,
      children: inner,
    }
  })

  const unassigned = active.filter((e) => !e.departmentId)

  const rootChildren: OrgTreeNode[] = [...deptChildren]
  if (unassigned.length) {
    rootChildren.push({
      id: 'unassigned',
      name: '__UNASSIGNED__',
      isDepartment: true,
      children: unassigned.map(employeeCard),
    })
  }

  return { id: 'root', name: '__ROOT__', children: rootChildren }
}
