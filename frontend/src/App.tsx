import { useAuth } from '@/stores/AuthContext'
import { DataProvider } from '@/stores/DataContext'
import { PageShell } from '@/components/layout/PageShell'
import Home from '@/pages/Home'
import AdminLogin from '@/pages/auth/AdminLogin'
import EmployeeLogin from '@/pages/auth/EmployeeLogin'
import Portal from '@/pages/employee/Portal'

export default function App() {
  const { page, role } = useAuth()

  if (page === 'home') return <Home />

  if (page === 'admin' && !role) return <AdminLogin />
  if (page === 'employee' && !role) return <EmployeeLogin />

  if (role === 'admin') {
    return (
      <DataProvider>
        <PageShell />
      </DataProvider>
    )
  }

  return <Portal />
}
