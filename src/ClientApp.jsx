import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ClientContext } from './contexts/ClientContext'
import { getClientBySlug, getTeam, authenticateUser } from './utils/data'
import { getPrimaryRole } from './utils/roles'
import ClientLogin from './pages/ClientLogin'
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

export default function ClientApp() {
  const { clientSlug } = useParams()
  const [clientConfig, setClientConfig] = useState(null)
  const [clientLoading, setClientLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [user, setUser] = useState(() => {
    // Check if superadmin is logged in
    const sa = localStorage.getItem('bw_superadmin')
    if (sa) return sa
    return localStorage.getItem(`bw_client_${clientSlug}_user`) || null
  })
  const [userRole, setUserRole] = useState(null)
  const [appLoading, setAppLoading] = useState(true)

  const isSuperAdmin = !!localStorage.getItem('bw_superadmin')

  // Load client config
  useEffect(() => {
    setClientLoading(true)
    getClientBySlug(clientSlug).then(config => {
      if (!config) {
        setNotFound(true)
      } else {
        setClientConfig(config)
      }
      setClientLoading(false)
    })
  }, [clientSlug])

  // Load user role once we have client config + user
  useEffect(() => {
    if (!user || !clientConfig) {
      setUserRole(null)
      setAppLoading(false)
      return
    }

    if (isSuperAdmin) {
      // SuperAdmin gets director access
      setUserRole('director')
      setAppLoading(false)
      return
    }

    getTeam(clientConfig.id).then(team => {
      const member = team.find(m => m.email === user)
      setUserRole(member?.role || 'closer')
      setAppLoading(false)
    })
  }, [user, clientConfig])

  function handleLogin(email) {
    localStorage.setItem(`bw_client_${clientSlug}_user`, email)
    setUser(email)
  }

  function handleLogout() {
    if (isSuperAdmin) {
      // SuperAdmin: go back to admin console
      window.location.href = '/admin/consola'
      return
    }
    localStorage.removeItem(`bw_client_${clientSlug}_user`)
    setUser(null)
  }

  const clientAuth = useMemo(() => {
    if (!clientConfig) return () => null
    return (email, password) => authenticateUser(email, password, clientConfig.id)
  }, [clientConfig])

  // Build CSS custom properties from client config
  const cssVars = useMemo(() => {
    if (!clientConfig) return {}
    return {
      '--orange': clientConfig.primaryColor,
      '--yellow': clientConfig.secondaryColor,
      '--bg': clientConfig.bgColor,
      '--bg-card': clientConfig.bgCardColor,
      '--bg-card-hover': clientConfig.bgCardColor,
      '--bg-sidebar': clientConfig.bgSidebarColor,
      '--border': clientConfig.borderColor,
      '--border-focus': clientConfig.primaryColor,
      '--text': clientConfig.textColor,
      '--text-secondary': clientConfig.textSecondaryColor,
      '--gradient': `linear-gradient(135deg, ${clientConfig.primaryColor}, ${clientConfig.secondaryColor})`,
      '--glow': `${clientConfig.primaryColor}40`,
    }
  }, [clientConfig])

  const ctxValue = useMemo(() => ({
    clientSlug,
    clientId: clientConfig?.id || null,
    clientConfig,
  }), [clientSlug, clientConfig])

  if (clientLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999' }}>Cargando...</div>
  }

  if (notFound) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff' }}>404</h1>
        <p>Cliente no encontrado</p>
      </div>
    )
  }

  if (appLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999' }}>Cargando...</div>
  }

  if (!user) {
    return (
      <ClientContext.Provider value={ctxValue}>
        <div style={cssVars}>
          <ClientLogin clientConfig={clientConfig} onLogin={handleLogin} authenticateUser={clientAuth} />
        </div>
      </ClientContext.Provider>
    )
  }

  const primaryRole = getPrimaryRole(userRole)
  const isDirector = primaryRole === 'director'

  return (
    <ClientContext.Provider value={ctxValue}>
      <div style={cssVars}>
        <Layout user={user} onLogout={handleLogout} role={userRole} clientConfig={clientConfig} clientSlug={clientSlug} isSuperAdmin={isSuperAdmin}>
          <Routes>
            <Route path="/" element={<Navigate to="ventas" replace />} />
            <Route path="ventas" element={<SalesDashboard />} />
            <Route path="reportes" element={<ReportsDashboard />} />
            <Route path="ventas/tabla" element={<SalesTable />} />
            <Route path="reportes/tabla" element={<ReportsTable />} />
            <Route path="ventas/nueva" element={<NewSale />} />
            <Route path="reportes/nuevo" element={<NewReport />} />
            <Route path="marketing" element={isDirector ? <MarketingDashboard /> : <Navigate to="ventas" replace />} />
            <Route path="contenido" element={isDirector ? <ContentDashboard /> : <Navigate to="ventas" replace />} />
            <Route path="equipo" element={isDirector ? <TeamPage /> : <Navigate to="ventas" replace />} />
            <Route path="proyecciones" element={<ProjectionsPage />} />
            <Route path="comisiones" element={<CommissionsPage user={user} role={userRole} />} />
            <Route path="metodos-pago" element={isDirector ? <PaymentMethodsPage /> : <Navigate to="ventas" replace />} />
            <Route path="settings" element={<SettingsPage user={user} />} />
            <Route path="*" element={<Navigate to="ventas" replace />} />
          </Routes>
        </Layout>
      </div>
    </ClientContext.Provider>
  )
}
