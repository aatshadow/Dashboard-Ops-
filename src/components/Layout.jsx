import { NavLink, useLocation } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { getPrimaryRole, hasRole } from '../utils/roles'
import AgentChat from './AgentChat'

function buildNavItems(prefix) {
  return [
    {
      label: 'CEO Mind',
      icon: '🧠',
      children: [
        { to: `${prefix}/ceo`, label: 'Overview', icon: '🧠' },
        { to: `${prefix}/ceo/equipo`, label: 'Equipo', icon: '👥' },
        { to: `${prefix}/ceo/meetings`, label: 'Meetings', icon: '🎙️' },
        { to: `${prefix}/ceo/proyectos`, label: 'Proyectos', icon: '📁' },
        { to: `${prefix}/ceo/ideas`, label: 'Ideas', icon: '💡' },
        { to: `${prefix}/ceo/pulso`, label: 'Pulso Semanal', icon: '📊' },
        { to: `${prefix}/ceo/roadmap`, label: 'Roadmap', icon: '🗺️' },
        { to: `${prefix}/ceo/finanzas`, label: 'Finanzas', icon: '💰' },
      ]
    },
    {
      label: 'Ventas',
      icon: '💰',
      children: [
        { to: `${prefix}/ventas`, label: 'Dashboard', icon: '📊' },
        { to: `${prefix}/ventas/tabla`, label: 'Tabla', icon: '📑' },
        { to: `${prefix}/ventas/nueva`, label: 'Reportar Venta', icon: '➕' },
      ]
    },
    {
      label: 'Reportes',
      icon: '📋',
      children: [
        { to: `${prefix}/reportes`, label: 'Dashboard', icon: '📊' },
        { to: `${prefix}/reportes/tabla`, label: 'Tabla', icon: '📝' },
        { to: `${prefix}/reportes/nuevo`, label: 'EOD Report', icon: '🕐' },
      ]
    },
    {
      label: 'Marketing',
      icon: '📣',
      children: [
        { to: `${prefix}/marketing`, label: 'Dashboard', icon: '📊' },
      ]
    },
    {
      label: 'Contenido',
      icon: '🎬',
      children: [
        { to: `${prefix}/contenido`, label: 'Dashboard', icon: '📊' },
      ]
    },
    {
      label: 'CRM',
      icon: '📇',
      children: [
        { to: `${prefix}/crm`, label: 'Pipeline', icon: '📊' },
        { to: `${prefix}/crm?view=tasks`, label: 'Tareas CRM', icon: '✅' },
      ]
    },
    {
      label: 'Task Management',
      icon: '📋',
      children: [
        { to: `${prefix}/task-management`, label: 'Gestión de Tareas', icon: '📋' },
        { to: `${prefix}/planning`, label: 'Planning', icon: '📅' },
      ]
    },
    {
      label: 'Management',
      icon: '⚙️',
      children: [
        { to: `${prefix}/equipo`, label: 'Equipo', icon: '👥' },
        { to: `${prefix}/proyecciones`, label: 'Proyecciones', icon: '🎯' },
        { to: `${prefix}/comisiones`, label: 'Comisiones', icon: '💸' },
        { to: `${prefix}/productos`, label: 'Productos', icon: '📦' },
        { to: `${prefix}/metodos-pago`, label: 'Métodos de Pago', icon: '💳' },
        { to: `${prefix}/settings`, label: 'Settings', icon: '⚙️' },
      ]
    },
  ]
}

export default function Layout({ children, user, onLogout, role, clientConfig, clientSlug, isSuperAdmin }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const prefix = `/${clientSlug}`
  const navItems = useMemo(() => buildNavItems(prefix), [prefix])

  const logoUrl = clientConfig?.logoUrl || null
  const brandName = clientConfig?.name || 'Dashboard'

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Filter nav items based on user role
  const primaryRole = getPrimaryRole(role)
  const isCeo = hasRole(role, 'ceo')
  const visibleNavItems = useMemo(() => {
    // CEO sees everything
    if (isCeo) return navItems
    // Director sees everything except CEO Mind
    if (primaryRole === 'director') return navItems.filter(g => g.label !== 'CEO Mind')

    return navItems.filter(group => {
      if (group.label === 'CEO Mind') return false
      if (group.label === 'Ventas' || group.label === 'Reportes') return true
      if (group.label === 'CRM') return true
      if (group.label === 'Task Management') return true
      if (group.label === 'Management') return true
      return false
    }).map(group => {
      if (group.label === 'Management') {
        return { ...group, children: group.children.filter(c =>
          c.to === `${prefix}/proyecciones` || c.to === `${prefix}/comisiones` || c.to === `${prefix}/settings`
        ) }
      }
      return group
    })
  }, [primaryRole, isCeo, navItems, prefix])

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState(() => {
    const open = {}
    navItems.forEach(g => {
      if (g.children.some(c => location.pathname === c.to || location.pathname.startsWith(c.to + '/'))) {
        open[g.label] = true
      }
    })
    return open
  })

  function toggleGroup(label) {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const pageTitle = (() => {
    for (const g of navItems) {
      const match = g.children.find(i => i.to === location.pathname)
      if (match) return `${g.label} — ${match.label}`
    }
    return 'Dashboard'
  })()

  const sidebarContent = (
    <>
      <div className="sidebar-header">
        {logoUrl ? (
          <img src={logoUrl} alt={brandName} className="sidebar-logo" />
        ) : (
          <div className="sidebar-logo-placeholder">{brandName[0]}</div>
        )}
        {!collapsed && <span className="sidebar-brand">{brandName}</span>}
      </div>

      <nav className="sidebar-nav">
        {visibleNavItems.map(group => {
          const isActive = group.children.some(c => location.pathname === c.to)
          const isOpen = openGroups[group.label]

          return (
            <div key={group.label} className="nav-group">
              <button
                className={`nav-group-btn ${isActive ? 'nav-group-btn--active' : ''}`}
                onClick={() => toggleGroup(group.label)}
                title={group.label}
              >
                <span className="nav-icon">{group.icon}</span>
                {!collapsed && (
                  <>
                    <span className="nav-label">{group.label}</span>
                    <span className={`nav-chevron ${isOpen ? 'nav-chevron--open' : ''}`}>›</span>
                  </>
                )}
              </button>

              {isOpen && !collapsed && (
                <div className="nav-group-children">
                  {group.children.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `nav-child ${isActive ? 'nav-child--active' : ''}`}
                    >
                      <span className="nav-child-dot" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button onClick={() => setCollapsed(!collapsed)} className="sidebar-toggle sidebar-toggle--desktop" title="Toggle sidebar">
          {collapsed ? '→' : '←'}
        </button>
        {isSuperAdmin && (
          <button onClick={() => { window.location.href = '/admin/consola' }} className="sidebar-logout" title="Volver a consola" style={{ marginBottom: '4px', opacity: 0.7 }}>
            {collapsed ? '🏠' : '← Consola'}
          </button>
        )}
        <button onClick={onLogout} className="sidebar-logout" title="Cerrar sesión">
          {collapsed ? '⏻' : 'Cerrar sesión'}
        </button>
      </div>
    </>
  )

  return (
    <div className={`layout ${collapsed ? 'layout--collapsed' : ''}`}>
      <aside className="sidebar sidebar--desktop">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`sidebar sidebar--mobile ${mobileMenuOpen ? 'sidebar--mobile-open' : ''}`}>
        {sidebarContent}
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
            <h1 className="topbar-title">{pageTitle}</h1>
          </div>
          <div className="topbar-user">
            <div className="topbar-avatar">{(user || 'U')[0].toUpperCase()}</div>
            <span className="topbar-email">{user}</span>
          </div>
        </header>
        <div className="main-content">
          {children}
        </div>
      </main>

      <AgentChat />
    </div>
  )
}
