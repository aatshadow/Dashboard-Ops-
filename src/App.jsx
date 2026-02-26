import { useState, useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import SalesDashboard from './pages/SalesDashboard'
import ReportsDashboard from './pages/ReportsDashboard'
import SalesTable from './pages/SalesTable'
import ReportsTable from './pages/ReportsTable'
import NewSale from './pages/NewSale'
import NewReport from './pages/NewReport'
import MarketingDashboard from './pages/MarketingDashboard'
import ContentDashboard from './pages/ContentDashboard'
import TeamPage from './pages/TeamPage'
import ProjectionsPage from './pages/ProjectionsPage'
import CommissionsPage from './pages/CommissionsPage'
import PaymentMethodsPage from './pages/PaymentMethodsPage'
import SettingsPage from './pages/SettingsPage'
import { getTeam } from './utils/data'

export default function App() {
  const [user, setUser] = useState(() => {
    return localStorage.getItem('fba_user') || null
  })

  const userRole = useMemo(() => {
    if (!user) return null
    const team = getTeam()
    const member = team.find(m => m.email === user)
    return member?.role || 'closer'
  }, [user])

  function handleLogin(email) {
    localStorage.setItem('fba_user', email)
    setUser(email)
  }

  function handleLogout() {
    localStorage.removeItem('fba_user')
    setUser(null)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const isDirector = userRole === 'director'
  const isManager = userRole === 'manager'
  const canSeeProjections = isDirector || isManager || userRole === 'closer' || userRole === 'setter'

  return (
    <Layout user={user} onLogout={handleLogout} role={userRole}>
      <Routes>
        <Route path="/" element={<Navigate to="/ventas" replace />} />
        {/* Ventas & Reportes — all roles */}
        <Route path="/ventas" element={<SalesDashboard />} />
        <Route path="/reportes" element={<ReportsDashboard />} />
        <Route path="/ventas/tabla" element={<SalesTable />} />
        <Route path="/reportes/tabla" element={<ReportsTable />} />
        <Route path="/ventas/nueva" element={<NewSale />} />
        <Route path="/reportes/nuevo" element={<NewReport />} />
        {/* Marketing & Contenido — director only */}
        <Route path="/marketing" element={isDirector ? <MarketingDashboard /> : <Navigate to="/ventas" replace />} />
        <Route path="/contenido" element={isDirector ? <ContentDashboard /> : <Navigate to="/ventas" replace />} />
        {/* Management — role-gated */}
        <Route path="/equipo" element={isDirector ? <TeamPage /> : <Navigate to="/ventas" replace />} />
        <Route path="/proyecciones" element={canSeeProjections ? <ProjectionsPage /> : <Navigate to="/ventas" replace />} />
        <Route path="/comisiones" element={isDirector ? <CommissionsPage /> : <Navigate to="/ventas" replace />} />
        <Route path="/metodos-pago" element={isDirector ? <PaymentMethodsPage /> : <Navigate to="/ventas" replace />} />
        {/* Settings — all roles */}
        <Route path="/settings" element={<SettingsPage user={user} />} />
        <Route path="*" element={<Navigate to="/ventas" replace />} />
      </Routes>
    </Layout>
  )
}
