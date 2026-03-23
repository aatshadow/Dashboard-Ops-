import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ClientContext } from './contexts/ClientContext'
import { getClientBySlug, getTeam, authenticateUser } from './utils/data'
import { getPrimaryRole, hasRole } from './utils/roles'
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
import ProductsPage from './pages/ProductsPage'
import SettingsPage from './pages/SettingsPage'
import CrmPage from './pages/CrmPage'
import CeoOverview from './pages/ceo-mind/CeoOverview'
import CeoEquipo from './pages/ceo-mind/CeoEquipo'
import CeoMeetings from './pages/ceo-mind/CeoMeetings'
import CeoProyectos from './pages/ceo-mind/CeoProyectos'
import CeoIdeas from './pages/ceo-mind/CeoIdeas'
import CeoPulsoSemanal from './pages/ceo-mind/CeoPulsoSemanal'
import CeoRoadmap from './pages/ceo-mind/CeoRoadmap'
import CeoFinanzas from './pages/ceo-mind/CeoFinanzas'
import TaskManagementPage from './pages/TaskManagementPage'
import PlanningPage from './pages/PlanningPage'
import EmailMarketingPage from './pages/EmailMarketingPage'
import ChatBotPage from './pages/ChatBotPage'

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
      // SuperAdmin gets CEO + director access for testing
      setUserRole('ceo,director')
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
  const isCeo = hasRole(userRole, 'ceo')
  const isDirector = primaryRole === 'director'
  const isDirectorOrCeo = isDirector || isCeo

  return (
    <ClientContext.Provider value={ctxValue}>
      <div style={cssVars}>
        <Layout user={user} onLogout={handleLogout} role={userRole} clientConfig={clientConfig} clientSlug={clientSlug} isSuperAdmin={isSuperAdmin}>
          <Routes>
            <Route path="/" element={<Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="ventas" element={<SalesDashboard />} />
            <Route path="reportes" element={<ReportsDashboard />} />
            <Route path="ventas/tabla" element={<SalesTable />} />
            <Route path="reportes/tabla" element={<ReportsTable />} />
            <Route path="ventas/nueva" element={<NewSale />} />
            <Route path="reportes/nuevo" element={<NewReport />} />
            <Route path="marketing" element={isDirectorOrCeo ? <MarketingDashboard /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="contenido" element={isDirectorOrCeo ? <ContentDashboard /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="equipo" element={isDirectorOrCeo ? <TeamPage /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="proyecciones" element={<ProjectionsPage user={user} role={userRole} />} />
            <Route path="comisiones" element={<CommissionsPage user={user} role={userRole} />} />
            <Route path="metodos-pago" element={isDirectorOrCeo ? <PaymentMethodsPage /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="productos" element={isDirectorOrCeo ? <ProductsPage /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            {/* CRM */}
            <Route path="crm" element={<CrmPage />} />
            <Route path="task-management" element={<TaskManagementPage />} />
            <Route path="planning" element={<PlanningPage />} />
            <Route path="email-marketing" element={isDirectorOrCeo ? <EmailMarketingPage /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="chatbot" element={isDirectorOrCeo ? <ChatBotPage /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            {/* CEO Mind — CEO only */}
            <Route path="ceo" element={isCeo ? <CeoOverview /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="ceo/equipo" element={isCeo ? <CeoEquipo /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="ceo/meetings" element={isCeo ? <CeoMeetings /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="ceo/proyectos" element={isCeo ? <CeoProyectos /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="ceo/ideas" element={isCeo ? <CeoIdeas /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="ceo/pulso" element={isCeo ? <CeoPulsoSemanal /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="ceo/roadmap" element={isCeo ? <CeoRoadmap /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="ceo/finanzas" element={isCeo ? <CeoFinanzas /> : <Navigate to={`/${clientSlug}/ventas`} replace />} />
            <Route path="settings" element={<SettingsPage user={user} />} />
            <Route path="*" element={<Navigate to={`/${clientSlug}/ventas`} replace />} />
          </Routes>
        </Layout>
      </div>
    </ClientContext.Provider>
  )
}
