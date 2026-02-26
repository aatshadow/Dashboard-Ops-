import { NavLink, useLocation } from 'react-router-dom'
import { useState, useMemo } from 'react'

const navItems = [
  {
    label: 'Ventas',
    icon: '💰',
    children: [
      { to: '/ventas', label: 'Dashboard', icon: '📊' },
      { to: '/ventas/tabla', label: 'Tabla', icon: '📑' },
      { to: '/ventas/nueva', label: 'Reportar Venta', icon: '➕' },
    ]
  },
  {
    label: 'Reportes',
    icon: '📋',
    children: [
      { to: '/reportes', label: 'Dashboard', icon: '📊' },
      { to: '/reportes/tabla', label: 'Tabla', icon: '📝' },
      { to: '/reportes/nuevo', label: 'EOD Report', icon: '🕐' },
    ]
  },
  {
    label: 'Marketing',
    icon: '📣',
    children: [
      { to: '/marketing', label: 'Dashboard', icon: '📊' },
    ]
  },
  {
    label: 'Contenido',
    icon: '🎬',
    children: [
      { to: '/contenido', label: 'Dashboard', icon: '📊' },
    ]
  },
  {
    label: 'Management',
    icon: '⚙️',
    children: [
      { to: '/equipo', label: 'Equipo', icon: '👥' },
      { to: '/proyecciones', label: 'Proyecciones', icon: '🎯' },
      { to: '/comisiones', label: 'Comisiones', icon: '💸' },
      { to: '/metodos-pago', label: 'Métodos de Pago', icon: '💳' },
      { to: '/settings', label: 'Settings', icon: '⚙️' },
    ]
  },
]

export default function Layout({ children, user, onLogout, role }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  // Filter nav items based on user role
  const visibleNavItems = useMemo(() => {
    if (role === 'director') return navItems

    return navItems.filter(group => {
      if (group.label === 'Ventas' || group.label === 'Reportes') return true
      if (group.label === 'Management') return true
      return false
    }).map(group => {
      if (group.label === 'Management') {
        if (role === 'manager') {
          return { ...group, children: group.children.filter(c => c.to === '/proyecciones' || c.to === '/settings') }
        }
        // closer/setter — Proyecciones + Settings
        return { ...group, children: group.children.filter(c => c.to === '/proyecciones' || c.to === '/settings') }
      }
      return group
    })
  }, [role])

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

  return (
    <div className={`layout ${collapsed ? 'layout--collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/assets/logo.jpeg" alt="FBA" className="sidebar-logo" />
          {!collapsed && <span className="sidebar-brand">FBA Academy</span>}
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
          <button onClick={() => setCollapsed(!collapsed)} className="sidebar-toggle" title="Toggle sidebar">
            {collapsed ? '→' : '←'}
          </button>
          <button onClick={onLogout} className="sidebar-logout" title="Cerrar sesión">
            {collapsed ? '⏻' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1 className="topbar-title">{pageTitle}</h1>
          <div className="topbar-user">
            <div className="topbar-avatar">E</div>
            <span className="topbar-email">{user}</span>
          </div>
        </header>
        <div className="main-content">
          {children}
        </div>
      </main>
    </div>
  )
}
