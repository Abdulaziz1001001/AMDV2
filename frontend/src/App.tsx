import { useAuth } from '@/stores/AuthContext'
import { DataProvider } from '@/stores/DataContext'
import { AdminNavProvider } from '@/stores/AdminNavContext'
import { PageShell } from '@/features/core/components/AdminPortalShell'
import Home from '@/features/auth/components/HomeGate'
import AdminLogin from '@/features/auth/components/AdminLoginPage'
import EmployeeLogin from '@/features/auth/components/EmployeeLoginPage'
import Portal from '@/features/core/components/EmployeePortalShell'

export default function App() {
  const { page, role } = useAuth()

  if (page === 'home') return <Home />

  if (page === 'admin' && !role) return <AdminLogin />
  if (page === 'employee' && !role) return <EmployeeLogin />

  if (role === 'admin') {
    return (
      <DataProvider>
        <AdminNavProvider>
          <PageShell />
        </AdminNavProvider>
      </DataProvider>
    )
  }

  return <Portal />
}
