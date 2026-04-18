import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as authApi from '@/api/auth'
import { fetchAdminProfile } from '@/api/admin'

type Role = 'admin' | 'manager' | 'employee' | null
type Page = 'home' | 'admin' | 'employee'

interface Session {
  id: string
  name: string
  username: string
  email?: string
  role?: string
  eid?: string
  departmentId?: string
  groupId?: string
  workStart?: string
  workEnd?: string
  salary?: number
}

interface AuthCtx {
  page: Page
  role: Role
  session: Session | null
  adminLogin: (u: string, p: string) => Promise<void>
  empLogin: (u: string, p: string) => Promise<void>
  logout: () => void
  patchSession: (partial: Partial<Session>) => void
  goto: (p: Page) => void
}

const AuthContext = createContext<AuthCtx>({
  page: 'home',
  role: null,
  session: null,
  adminLogin: async () => {},
  empLogin: async () => {},
  logout: () => {},
  patchSession: () => {},
  goto: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>('home')
  const [role, setRole] = useState<Role>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const storedRole = authApi.getStoredRole()
    if (storedRole && authApi.isAuthenticated()) {
      if (storedRole === 'admin') {
        setRole('admin')
        setPage('admin')
        fetchAdminProfile()
          .then((p) => {
            setSession({ id: p.id, name: p.name, username: p.username, email: p.email })
          })
          .catch(() => {})
      } else {
        setRole(storedRole as Role)
        setPage('employee')
      }
    }

    const handleUnauth = () => {
      setRole(null)
      setSession(null)
      setPage('home')
    }
    window.addEventListener('amd-unauthorized', handleUnauth)
    return () => window.removeEventListener('amd-unauthorized', handleUnauth)
  }, [])

  const adminLogin = useCallback(async (u: string, p: string) => {
    const res = await authApi.adminLogin(u, p)
    const admin = res.admin!
    setSession({ id: admin.id, name: admin.name, username: admin.username, email: admin.email })
    setRole('admin')
    setPage('admin')
  }, [])

  const empLogin = useCallback(async (u: string, p: string) => {
    const res = await authApi.empLogin(u, p)
    const emp = res.employee!
    setSession({
      id: emp.id,
      name: emp.name,
      username: emp.username,
      eid: emp.eid,
      role: emp.role,
      departmentId: emp.departmentId,
      groupId: emp.groupId,
      workStart: emp.workStart,
      workEnd: emp.workEnd,
      salary: emp.salary,
    })
    setRole((emp.role as Role) || 'employee')
    setPage('employee')
  }, [])

  const logout = useCallback(() => {
    authApi.logout()
    setRole(null)
    setSession(null)
    setPage('home')
  }, [])

  const patchSession = useCallback((partial: Partial<Session>) => {
    setSession((s) => (s ? { ...s, ...partial } : null))
  }, [])

  const goto = useCallback((p: Page) => setPage(p), [])

  return (
    <AuthContext.Provider value={{ page, role, session, adminLogin, empLogin, logout, patchSession, goto }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
