import { useState } from 'react'
import { getSalesWithNetCash, getTeam } from '../utils/data'
import { useAsync } from '../hooks/useAsync'

const ROLE_LABELS = { director: 'Director', manager: 'Manager', closer: 'Closer', setter: 'Setter' }

export default function CommissionsPage({ user, role: userRole }) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [team, teamLoading] = useAsync(getTeam, [])
  const [allSales, salesLoading] = useAsync(getSalesWithNetCash, [])

  if (teamLoading || salesLoading) return <div className="dashboard"><div style={{textAlign:'center',padding:60,color:'#999'}}>Cargando comisiones...</div></div>

  const monthSales = allSales.filter(s => s.date.startsWith(month))
  const totalNetCash = monthSales.reduce((s, v) => s + v.netCash, 0)

  // Net cash by closer
  const cashByCloser = monthSales.reduce((acc, s) => {
    acc[s.closer] = (acc[s.closer] || 0) + s.netCash
    return acc
  }, {})

  // Compute commissions on net cash
  const allCommissions = team.filter(m => m.active).map(m => {
    const cash = m.role === 'closer' ? (cashByCloser[m.name] || 0) : totalNetCash
    const commission = Math.round(cash * m.commissionRate)
    return { ...m, cash, commission }
  })

  // If user is closer/setter, only show their own commission
  const isRestricted = userRole === 'closer' || userRole === 'setter'
  const commissions = isRestricted
    ? allCommissions.filter(c => c.email === user)
    : allCommissions

  const totalCommissions = allCommissions.reduce((s, c) => s + c.commission, 0)
  const closerCommissions = allCommissions.filter(c => c.role === 'closer').reduce((s, c) => s + c.commission, 0)
  const setterCommissions = allCommissions.filter(c => c.role === 'setter').reduce((s, c) => s + c.commission, 0)
  const otherCommissions = totalCommissions - closerCommissions - setterCommissions

  const myCommission = isRestricted && commissions.length > 0 ? commissions[0] : null

  const fmt = (n) => `€${Math.round(n).toLocaleString('es-ES')}`

  return (
    <div className="dashboard">
      <div className="filters-bar">
        <div className="filters-left">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="filter-select" style={{ minWidth: 160, colorScheme: 'dark' }} />
        </div>
      </div>

      {/* Summary cards */}
      {isRestricted ? (
        <div className="stats-grid stats-grid--3">
          <div className="stat-card">
            <div className="stat-card-icon">💸</div>
            <div className="stat-card-value">{fmt(myCommission?.commission || 0)}</div>
            <div className="stat-card-label">Mi Comisión</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">💰</div>
            <div className="stat-card-value">{fmt(myCommission?.cash || 0)}</div>
            <div className="stat-card-label">Cash Neto Base</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">📊</div>
            <div className="stat-card-value">{myCommission ? (myCommission.commissionRate * 100).toFixed(0) : 0}%</div>
            <div className="stat-card-label">Mi Tasa</div>
          </div>
        </div>
      ) : (
        <div className="stats-grid stats-grid--4">
          <div className="stat-card">
            <div className="stat-card-icon">💸</div>
            <div className="stat-card-value">{fmt(totalCommissions)}</div>
            <div className="stat-card-label">Total Comisiones</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">📞</div>
            <div className="stat-card-value">{fmt(closerCommissions)}</div>
            <div className="stat-card-label">Closers</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">💬</div>
            <div className="stat-card-value">{fmt(setterCommissions)}</div>
            <div className="stat-card-label">Setters</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">👤</div>
            <div className="stat-card-value">{fmt(otherCommissions)}</div>
            <div className="stat-card-label">Otros</div>
          </div>
        </div>
      )}

      {/* Commission Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Cash Neto</th>
              <th>Tasa</th>
              <th>Comisión</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map(c => (
              <tr key={c.id} className={c.commission > 0 ? 'commission-row--has' : ''}>
                <td className="cell-bold">{c.name}</td>
                <td><span className={`badge badge--${c.role}`}>{ROLE_LABELS[c.role]}</span></td>
                <td className="cell-money">{fmt(c.cash)}</td>
                <td>{(c.commissionRate * 100).toFixed(0)}%</td>
                <td className="cell-money" style={{ color: c.commission > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{fmt(c.commission)}</td>
                <td><span className={`badge ${c.active ? 'badge--completada' : 'badge--reembolso'}`}>{c.active ? 'Activo' : 'Inactivo'}</span></td>
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr><td colSpan={6} className="cell-muted" style={{ padding: 24 }}>Sin datos de equipo</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
