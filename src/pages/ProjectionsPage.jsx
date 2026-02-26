import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getProjections, addProjection, updateProjection, deleteProjection, getTeam, getSalesWithNetCash, getReports } from '../utils/data'

function getISOWeek(date) {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getWeekRange(weekStr) {
  const [yearStr, weekPart] = weekStr.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(weekPart)
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = (jan4.getDay() + 6) % 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const f = d => d.toISOString().split('T')[0]
  return { start: f(monday), end: f(sunday) }
}

function dateInPeriod(dateStr, period, periodType) {
  if (periodType === 'monthly') return dateStr.startsWith(period)
  const { start, end } = getWeekRange(period)
  return dateStr >= start && dateStr <= end
}

function getPreviousPeriods(currentPeriod, periodType, count) {
  const periods = []
  if (periodType === 'monthly') {
    let [y, m] = currentPeriod.split('-').map(Number)
    for (let i = 0; i < count; i++) {
      periods.unshift(`${y}-${String(m).padStart(2, '0')}`)
      m--
      if (m < 1) { m = 12; y-- }
    }
  } else {
    let [yearStr, weekPart] = currentPeriod.split('-W')
    let y = parseInt(yearStr), w = parseInt(weekPart)
    for (let i = 0; i < count; i++) {
      periods.unshift(`${y}-W${String(w).padStart(2, '0')}`)
      w--
      if (w < 1) { y--; w = 52 }
    }
  }
  return periods
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MESES[d.getMonth()].toLowerCase().slice(0, 3)}`
}

function getPeriodLabel(period, periodType) {
  if (periodType === 'monthly') {
    const [y, m] = period.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    return `${MESES[m - 1]} ${y} — del 1 al ${daysInMonth}`
  }
  const { start, end } = getWeekRange(period)
  const weekNum = parseInt(period.split('-W')[1])
  return `Semana ${weekNum} — ${formatDateShort(start)} al ${formatDateShort(end)}`
}

export default function ProjectionsPage() {
  const [projections, setProjections] = useState(() => getProjections())
  const [periodType, setPeriodType] = useState('monthly')
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [weekPeriod, setWeekPeriod] = useState(() => getISOWeek(new Date()))
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ type: 'company', memberId: '', cashTarget: '', revenueTarget: '', appointmentTarget: '' })

  const currentPeriod = periodType === 'monthly' ? period : weekPeriod
  const periodLabel = getPeriodLabel(currentPeriod, periodType)

  const sales = useMemo(() => getSalesWithNetCash(), [])
  const reports = useMemo(() => getReports(), [])
  const team = useMemo(() => getTeam(), [])
  const activeClosers = team.filter(m => m.role === 'closer' && m.active)
  const activeSetters = team.filter(m => m.role === 'setter' && m.active)

  // Current user for role-based filtering
  const currentUser = useMemo(() => {
    const email = localStorage.getItem('fba_user')
    return team.find(m => m.email === email) || null
  }, [team])

  const isAdmin = currentUser && (currentUser.role === 'director' || currentUser.role === 'manager')

  // Filter projections by current period
  const periodProjections = projections.filter(p => {
    const pPeriod = p.period || p.month
    const pType = p.periodType || 'monthly'
    return pPeriod === currentPeriod && pType === periodType
  })

  const companyProj = periodProjections.find(p => p.type === 'company')
  const allCloserProjs = periodProjections.filter(p => p.type === 'closer')
  const allSetterProjs = periodProjections.filter(p => p.type === 'setter')

  // Role-based visibility
  let visibleCloserProjs = allCloserProjs
  let visibleSetterProjs = allSetterProjs
  if (!isAdmin && currentUser) {
    if (currentUser.role === 'closer') {
      visibleCloserProjs = allCloserProjs.filter(p => p.name === currentUser.name || p.memberId === currentUser.id)
      visibleSetterProjs = []
    } else if (currentUser.role === 'setter') {
      visibleCloserProjs = []
      visibleSetterProjs = allSetterProjs.filter(p => p.name === currentUser.name || p.memberId === currentUser.id)
    }
  }

  // Current period data
  const periodSales = sales.filter(s => dateInPeriod(s.date, currentPeriod, periodType))
  const periodReports = reports.filter(r => dateInPeriod(r.date, currentPeriod, periodType))

  const totalNetCash = periodSales.reduce((s, v) => s + v.netCash, 0)
  const totalRevenue = periodSales.reduce((s, v) => s + v.revenue, 0)

  const cashByCloser = periodSales.reduce((acc, s) => {
    acc[s.closer] = (acc[s.closer] || 0) + s.netCash
    return acc
  }, {})

  const appointmentsBySetter = periodReports.filter(r => r.role === 'setter').reduce((acc, r) => {
    acc[r.name] = (acc[r.name] || 0) + r.appointmentsBooked
    return acc
  }, {})

  // Historical data for chart
  const historicalPeriods = getPreviousPeriods(currentPeriod, periodType, 6)
  const historicalData = historicalPeriods.map(p => {
    const pSales = sales.filter(s => dateInPeriod(s.date, p, periodType))
    const actualCash = pSales.reduce((s, v) => s + v.netCash, 0)
    const proj = projections.find(pr => {
      const prPeriod = pr.period || pr.month
      const prType = pr.periodType || 'monthly'
      return prPeriod === p && prType === periodType && pr.type === 'company'
    })
    const target = proj ? proj.cashTarget : 0
    const label = periodType === 'monthly' ? p.slice(5) : p.split('-W')[1]
    return { period: periodType === 'monthly' ? p : `S${label}`, target, actual: Math.round(actualCash) }
  })

  const fmt = (n) => `€${Math.round(n).toLocaleString('es-ES')}`
  const pct = (current, target) => target > 0 ? Math.min(Math.round(current / target * 100), 100) : 0

  const startInlineEdit = (id, currentValue) => {
    setEditingId(id)
    setEditValue(String(currentValue))
  }

  const saveInlineEdit = (projId, field) => {
    const updated = updateProjection(projId, { [field]: +editValue })
    setProjections(updated)
    setEditingId(null)
  }

  const TargetDisplay = ({ projId, field, value, label, editable }) => {
    const key = `${projId}-${field}`
    if (editable && editingId === key) {
      return (
        <input
          type="number"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => saveInlineEdit(projId, field)}
          onKeyDown={e => e.key === 'Enter' && saveInlineEdit(projId, field)}
          autoFocus
          className="inline-edit-input"
        />
      )
    }
    if (editable) {
      return (
        <span className="editable-value" onClick={() => startInlineEdit(key, value)} title="Click para editar">
          {label || fmt(value)}
        </span>
      )
    }
    return <span>{label || fmt(value)}</span>
  }

  const handleAddProjection = (e) => {
    e.preventDefault()
    const member = addForm.type !== 'company' ? team.find(m => m.id === addForm.memberId) : null
    const data = {
      period: currentPeriod,
      periodType,
      type: addForm.type,
      memberId: addForm.memberId || null,
      name: addForm.type === 'company' ? 'Empresa' : (member?.name || ''),
      cashTarget: +addForm.cashTarget || 0,
      revenueTarget: +addForm.revenueTarget || 0,
      appointmentTarget: +addForm.appointmentTarget || 0,
    }
    setProjections(addProjection(data))
    setAddForm({ type: 'company', memberId: '', cashTarget: '', revenueTarget: '', appointmentTarget: '' })
    setShowAddForm(false)
  }

  const handleDeleteProjection = (id) => {
    if (confirm('¿Eliminar esta proyección?')) {
      setProjections(deleteProjection(id))
    }
  }

  const memberOptions = addForm.type === 'closer' ? activeClosers : addForm.type === 'setter' ? activeSetters : []

  return (
    <div className="dashboard">
      {/* FILTERS & PERIOD INFO */}
      <div className="filters-bar">
        <div className="filters-left">
          <div className="role-toggle" style={{ marginRight: 12 }}>
            <button type="button" className={`role-btn ${periodType === 'monthly' ? 'role-btn--active' : ''}`} onClick={() => setPeriodType('monthly')}>Mensual</button>
            <button type="button" className={`role-btn ${periodType === 'weekly' ? 'role-btn--active' : ''}`} onClick={() => setPeriodType('weekly')}>Semanal</button>
          </div>
          {periodType === 'monthly' ? (
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="filter-select" style={{ minWidth: 160 }} />
          ) : (
            <input type="week" value={weekPeriod} onChange={e => setWeekPeriod(e.target.value)} className="filter-select" style={{ minWidth: 180 }} />
          )}
        </div>
        <div className="filters-right">
          {isAdmin && (
            <button className="btn-action" onClick={() => setShowAddForm(!showAddForm)}>+ Añadir Proyección</button>
          )}
        </div>
      </div>

      {/* Period context banner */}
      <div className="period-banner">
        <span className="period-banner-label">Período activo:</span>
        <span className="period-banner-value">{periodLabel}</span>
        <span className="period-banner-sales">{periodSales.length} ventas &middot; {fmt(totalNetCash)} cash neto</span>
      </div>

      {/* ADD FORM (admin only) */}
      {showAddForm && isAdmin && (
        <div className="form-card" style={{ marginBottom: 28 }}>
          <h3 className="form-title">Nueva Proyección</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20, marginTop: -12 }}>
            Crea un objetivo para el período <strong style={{ color: 'var(--text-secondary)' }}>{periodLabel}</strong>. Los targets son los valores que el equipo debe alcanzar.
          </p>
          <form onSubmit={handleAddProjection}>
            <div className="form-grid form-grid--3">
              <div className="form-group">
                <label>¿Para quién es esta proyección?</label>
                <select value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value, memberId: ''})}>
                  <option value="company">Empresa (global)</option>
                  <option value="closer">Closer (individual)</option>
                  <option value="setter">Setter (individual)</option>
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  {addForm.type === 'company' && 'Objetivo global de la empresa para todo el período'}
                  {addForm.type === 'closer' && 'Objetivo individual de cash para un closer'}
                  {addForm.type === 'setter' && 'Objetivo individual de agendas para un setter'}
                </span>
              </div>
              {addForm.type !== 'company' && (
                <div className="form-group">
                  <label>Miembro del equipo</label>
                  <select value={addForm.memberId} onChange={e => setAddForm({...addForm, memberId: e.target.value})} required>
                    <option value="">Seleccionar persona...</option>
                    {memberOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              {(addForm.type === 'company' || addForm.type === 'closer') && (
                <div className="form-group">
                  <label>Cash Neto Target (€)</label>
                  <input type="number" value={addForm.cashTarget} onChange={e => setAddForm({...addForm, cashTarget: e.target.value})} placeholder="Ej: 50000" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Objetivo de cash neto (después de comisiones de método de pago)
                  </span>
                </div>
              )}
              {addForm.type === 'company' && (
                <div className="form-group">
                  <label>Revenue Target (€)</label>
                  <input type="number" value={addForm.revenueTarget} onChange={e => setAddForm({...addForm, revenueTarget: e.target.value})} placeholder="Ej: 80000" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Valor total de contratos cerrados (antes de cuotas)
                  </span>
                </div>
              )}
              {addForm.type === 'setter' && (
                <div className="form-group">
                  <label>Agendas Target</label>
                  <input type="number" value={addForm.appointmentTarget} onChange={e => setAddForm({...addForm, appointmentTarget: e.target.value})} placeholder="Ej: 20" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Número de llamadas agendadas que debe conseguir
                  </span>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="btn-action btn-action--secondary" onClick={() => setShowAddForm(false)}>Cancelar</button>
              <button type="submit" className="btn-action">Crear Proyección</button>
            </div>
          </form>
        </div>
      )}

      {/* HISTORICAL CHART */}
      <div className="section-label-dash">Histórico de Proyecciones</div>
      <div className="chart-card" style={{ marginBottom: 28 }}>
        <h3 className="chart-title">Target vs Actual — Últimos 6 {periodType === 'monthly' ? 'meses' : 'semanas'}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={historicalData} barGap={4}>
            <XAxis dataKey="period" stroke="#666" fontSize={13} />
            <YAxis stroke="#666" fontSize={13} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} formatter={(v) => [`€${v.toLocaleString()}`, '']} />
            <Legend />
            <Bar dataKey="target" name="Target" fill="#555" radius={[4,4,0,0]} />
            <Bar dataKey="actual" name="Actual" fill="#FF6B00" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* COMPANY PROJECTIONS */}
      {companyProj && (
        <>
          <div className="section-label-dash">Proyecciones Empresa — {periodLabel}</div>
          <div className="big-numbers">
            <div className="big-number-card">
              <div className="big-number-label">Cash Neto Target</div>
              <div className="big-number-value">
                <TargetDisplay projId={companyProj.id} field="cashTarget" value={companyProj.cashTarget} editable={isAdmin} />
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct(totalNetCash, companyProj.cashTarget)}%` }} />
              </div>
              <div className="stat-card-sub">{fmt(totalNetCash)} / {fmt(companyProj.cashTarget)} ({pct(totalNetCash, companyProj.cashTarget)}%)</div>
              {isAdmin && <button className="btn-sm btn-sm--delete" style={{ marginTop: 8 }} onClick={() => handleDeleteProjection(companyProj.id)}>🗑</button>}
            </div>
            <div className="big-number-card">
              <div className="big-number-label">Revenue Target</div>
              <div className="big-number-value">
                <TargetDisplay projId={companyProj.id} field="revenueTarget" value={companyProj.revenueTarget} editable={isAdmin} />
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct(totalRevenue, companyProj.revenueTarget)}%` }} />
              </div>
              <div className="stat-card-sub">{fmt(totalRevenue)} / {fmt(companyProj.revenueTarget)} ({pct(totalRevenue, companyProj.revenueTarget)}%)</div>
            </div>
          </div>
        </>
      )}

      {/* CLOSER PROJECTIONS */}
      {visibleCloserProjs.length > 0 && (
        <>
          <div className="section-label-dash">
            {!isAdmin && currentUser?.role === 'closer' ? 'Tu Proyección — Cash Target' : 'Closers — Cash Target'}
          </div>
          <div className={`stats-grid stats-grid--${Math.min(visibleCloserProjs.length, 4)}`}>
            {visibleCloserProjs.map(p => {
              const actual = cashByCloser[p.name] || 0
              return (
                <div key={p.id} className="stat-card">
                  <div className="stat-card-label" style={{ fontWeight: 700, marginBottom: 8 }}>{p.name}</div>
                  <div className="stat-card-value" style={{ fontSize: '1.3rem' }}>
                    <TargetDisplay projId={p.id} field="cashTarget" value={p.cashTarget} editable={isAdmin} />
                  </div>
                  <div className="progress-bar" style={{ margin: '10px 0' }}>
                    <div className="progress-fill" style={{ width: `${pct(actual, p.cashTarget)}%` }} />
                  </div>
                  <div className="stat-card-sub">{fmt(actual)} / {fmt(p.cashTarget)} ({pct(actual, p.cashTarget)}%)</div>
                  {isAdmin && <button className="btn-sm btn-sm--delete" style={{ marginTop: 8 }} onClick={() => handleDeleteProjection(p.id)}>🗑</button>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* SETTER PROJECTIONS */}
      {visibleSetterProjs.length > 0 && (
        <>
          <div className="section-label-dash">
            {!isAdmin && currentUser?.role === 'setter' ? 'Tu Proyección — Agendas Target' : 'Setters — Agendas Target'}
          </div>
          <div className={`stats-grid stats-grid--${Math.min(visibleSetterProjs.length, 4)}`}>
            {visibleSetterProjs.map(p => {
              const actual = appointmentsBySetter[p.name] || 0
              return (
                <div key={p.id} className="stat-card">
                  <div className="stat-card-label" style={{ fontWeight: 700, marginBottom: 8 }}>{p.name}</div>
                  <div className="stat-card-value" style={{ fontSize: '1.3rem' }}>
                    <TargetDisplay projId={p.id} field="appointmentTarget" value={p.appointmentTarget} label={String(p.appointmentTarget)} editable={isAdmin} />
                  </div>
                  <div className="progress-bar" style={{ margin: '10px 0' }}>
                    <div className="progress-fill" style={{ width: `${pct(actual, p.appointmentTarget)}%` }} />
                  </div>
                  <div className="stat-card-sub">{actual} / {p.appointmentTarget} agendas ({pct(actual, p.appointmentTarget)}%)</div>
                  {isAdmin && <button className="btn-sm btn-sm--delete" style={{ marginTop: 8 }} onClick={() => handleDeleteProjection(p.id)}>🗑</button>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {!companyProj && visibleCloserProjs.length === 0 && visibleSetterProjs.length === 0 && (
        <div className="empty-page" style={{ minHeight: '30vh' }}>
          <div className="empty-icon">🎯</div>
          <h2>Sin proyecciones</h2>
          <p>{isAdmin ? 'Añade proyecciones para este período usando el botón de arriba.' : 'No hay proyecciones configuradas para ti en este período. Contacta a tu manager.'}</p>
        </div>
      )}
    </div>
  )
}
