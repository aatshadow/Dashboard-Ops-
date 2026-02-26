import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts'
import Filters, { FilterSelect, getDateRange, getPreviousRange, dateInRange } from '../components/Filters'
import { getSalesWithNetCash, getReports } from '../utils/data'

const COLORS = ['#FF6B00', '#FFB800', '#FF8C3A', '#FFD060', '#E55A00', '#22C55E']
const STATUS_COLORS = { Completada: '#22C55E', Pendiente: '#FFB800', Reembolso: '#EF4444' }

export default function SalesDashboard() {
  const navigate = useNavigate()
  const allSales = useMemo(() => getSalesWithNetCash(), [])

  const [datePreset, setDatePreset] = useState('thisMonth')
  const [closerFilter, setCloserFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  const closers = [...new Set(allSales.map(s => s.closer))]
  const products = [...new Set(allSales.map(s => s.product))]
  const methods = [...new Set(allSales.map(s => s.paymentMethod))]

  const range = getDateRange(datePreset)
  const prevRange = getPreviousRange(datePreset)

  const applyFilters = (list) => list.filter(s => {
    if (closerFilter && s.closer !== closerFilter) return false
    if (productFilter && s.product !== productFilter) return false
    if (methodFilter && s.paymentMethod !== methodFilter) return false
    return true
  })

  const sales = applyFilters(allSales.filter(s => dateInRange(s.date, range)))
  const prevSales = applyFilters(allSales.filter(s => dateInRange(s.date, prevRange)))

  // ═══ CORE METRICS ═══
  const totalRevenue = sales.reduce((s, v) => s + v.revenue, 0)
  const totalCash = sales.reduce((s, v) => s + v.netCash, 0)
  const totalGrossCash = sales.reduce((s, v) => s + v.cashCollected, 0)
  const totalCount = sales.length
  const avgTicket = totalCount ? Math.round(totalRevenue / totalCount) : 0

  const prevRevenue = prevSales.reduce((s, v) => s + v.revenue, 0)
  const prevCash = prevSales.reduce((s, v) => s + v.netCash, 0)
  const prevCount = prevSales.length
  const prevAvgTicket = prevCount ? Math.round(prevRevenue / prevCount) : 0

  // Revenue pendiente: committed revenue minus collected cash
  const revenuePendiente = totalRevenue - totalGrossCash
  const pctCobrado = totalRevenue > 0 ? Math.round(totalGrossCash / totalRevenue * 100) : 100

  // Pace projection
  const pace = useMemo(() => {
    const now = new Date()
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    if (datePreset === 'thisMonth' && dayOfMonth > 0) {
      return Math.round(totalCash / dayOfMonth * daysInMonth)
    }
    return totalCash
  }, [totalCash, datePreset])

  // ═══ STATUS BREAKDOWN ═══
  const statusCounts = sales.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {})
  const completadas = statusCounts['Completada'] || 0
  const pendientes = statusCounts['Pendiente'] || 0
  const reembolsos = statusCounts['Reembolso'] || 0

  // ═══ CUOTAS ANALYSIS ═══
  const cuotaSales = sales.filter(s => s.paymentType !== 'Pago único')
  const cuotasPendientes = cuotaSales.filter(s => s.status === 'Pendiente').length

  // ═══ CASH BY PRODUCT ═══
  const cashByProduct = sales.reduce((acc, s) => {
    if (!acc[s.product]) acc[s.product] = 0
    acc[s.product] += s.netCash
    return acc
  }, {})

  // ═══ DAILY DATA ═══
  const byDay = sales.reduce((acc, s) => {
    const d = s.date
    if (!acc[d]) acc[d] = { date: d, revenue: 0, cash: 0, count: 0 }
    acc[d].revenue += s.revenue
    acc[d].cash += s.netCash
    acc[d].count += 1
    return acc
  }, {})
  const dailyData = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))

  // Cumulative data
  const cumulativeData = dailyData.reduce((acc, d, i) => {
    const prev = i > 0 ? acc[i - 1] : { cashAcum: 0, revAcum: 0 }
    acc.push({ ...d, cashAcum: prev.cashAcum + d.cash, revAcum: prev.revAcum + d.revenue })
    return acc
  }, [])

  // ═══ BY PRODUCT (PIE) ═══
  const byProduct = sales.reduce((acc, s) => {
    if (!acc[s.product]) acc[s.product] = 0
    acc[s.product] += s.revenue
    return acc
  }, {})
  const productData = Object.entries(byProduct).map(([name, value]) => ({ name, value }))

  // ═══ BY CLOSER ═══
  const byCloser = sales.reduce((acc, s) => {
    if (!acc[s.closer]) acc[s.closer] = { name: s.closer, revenue: 0, cash: 0, count: 0 }
    acc[s.closer].revenue += s.revenue
    acc[s.closer].cash += s.netCash
    acc[s.closer].count += 1
    return acc
  }, {})
  const closerData = Object.values(byCloser)

  // ═══ BY SETTER ATTRIBUTION (from sales data) ═══
  const setterAttrib = Object.values(sales.filter(s => s.setter).reduce((acc, s) => {
    if (!acc[s.setter]) acc[s.setter] = { name: s.setter, ventas: 0, revenue: 0, cash: 0 }
    acc[s.setter].ventas += 1
    acc[s.setter].revenue += s.revenue
    acc[s.setter].cash += s.netCash
    return acc
  }, {}))

  // ═══ BY UTM SOURCE ═══
  const byUtm = sales.reduce((acc, s) => {
    const src = s.utmSource || 'Directo'
    if (!acc[src]) acc[src] = { name: src, count: 0, revenue: 0, cash: 0 }
    acc[src].count += 1
    acc[src].revenue += s.revenue
    acc[src].cash += s.netCash
    return acc
  }, {})
  const utmData = Object.values(byUtm).sort((a, b) => b.revenue - a.revenue)

  // ═══ BY COUNTRY ═══
  const byCountry = sales.reduce((acc, s) => {
    const p = s.pais || 'Sin país'
    if (!acc[p]) acc[p] = { name: p, count: 0, revenue: 0 }
    acc[p].count += 1
    acc[p].revenue += s.revenue
    return acc
  }, {})
  const countryData = Object.values(byCountry).sort((a, b) => b.revenue - a.revenue)

  // ═══ BY PAYMENT TYPE ═══
  const byPayType = sales.reduce((acc, s) => {
    const key = s.paymentType
    if (!acc[key]) acc[key] = { name: key, count: 0, revenue: 0, cash: 0 }
    acc[key].count += 1
    acc[key].revenue += s.revenue
    acc[key].cash += s.netCash
    return acc
  }, {})
  const payTypeData = Object.values(byPayType)

  // ═══ BY PAYMENT METHOD ═══
  const byMethod = sales.reduce((acc, s) => {
    if (!acc[s.paymentMethod]) acc[s.paymentMethod] = 0
    acc[s.paymentMethod] += 1
    return acc
  }, {})
  const methodData = Object.entries(byMethod).map(([name, value]) => ({ name, value }))

  // ═══ STATUS DATA (for pie) ═══
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  // Leaderboard by cash collected
  const closerLeaderboard = useMemo(() => {
    return closerData.slice().sort((a, b) => b.cash - a.cash)
  }, [closerData])

  const medals = ['🥇', '🥈', '🥉']

  // Setter leaderboard from reports
  const allReports = useMemo(() => getReports(), [])
  const setterLeaderboard = (() => {
    const setterReports = allReports.filter(r => r.role === 'setter' && dateInRange(r.date, range))
    const byPerson = Object.values(setterReports.reduce((acc, r) => {
      if (!acc[r.name]) acc[r.name] = { name: r.name, conversaciones: 0, ofertas: 0, agendas: 0 }
      acc[r.name].conversaciones += r.conversationsOpened
      acc[r.name].ofertas += r.offersLaunched
      acc[r.name].agendas += r.appointmentsBooked
      return acc
    }, {}))
    if (byPerson.length === 0) return []
    const maxConvos = Math.max(...byPerson.map(d => d.conversaciones), 1)
    return byPerson.map(d => {
      const br = d.conversaciones ? (d.agendas / d.conversaciones * 100) : 0
      const volNorm = d.conversaciones / maxConvos * 100
      const score = br * 0.6 + volNorm * 0.4
      return { ...d, bookingRate: Math.round(br), score: Math.round(score) }
    }).sort((a, b) => b.score - a.score)
  })()

  const fmt = (n) => `€${n.toLocaleString('es-ES')}`
  const diff = (curr, prev) => curr - prev
  const diffClass = (curr, prev) => curr >= prev ? 'comp--up' : 'comp--down'

  return (
    <div className="dashboard">
      {/* FILTERS */}
      <Filters
        datePreset={datePreset}
        onDatePreset={setDatePreset}
        extras={
          <>
            <FilterSelect label="Closer" value={closerFilter} onChange={setCloserFilter} options={closers} />
            <FilterSelect label="Producto" value={productFilter} onChange={setProductFilter} options={products} />
            <FilterSelect label="Método pago" value={methodFilter} onChange={setMethodFilter} options={methods} />
          </>
        }
      />

      {/* ═══ BIG NUMBERS ═══ */}
      <div className="big-numbers" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="big-number-card">
          <div className="big-number-label">Revenue</div>
          <div className="big-number-value">{fmt(totalRevenue)}</div>
          <div className={`big-number-comp ${diffClass(totalRevenue, prevRevenue)}`}>
            {diff(totalRevenue, prevRevenue) >= 0 ? '+' : ''}{fmt(diff(totalRevenue, prevRevenue))} vs anterior
          </div>
        </div>
        <div className="big-number-card">
          <div className="big-number-label">Cash Neto</div>
          <div className="big-number-value">{fmt(totalCash)}</div>
          <div className={`big-number-comp ${diffClass(totalCash, prevCash)}`}>
            {diff(totalCash, prevCash) >= 0 ? '+' : ''}{fmt(diff(totalCash, prevCash))} vs anterior
          </div>
        </div>
        <div className="big-number-card">
          <div className="big-number-label">Revenue Pendiente</div>
          <div className="big-number-value" style={{ color: revenuePendiente > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {fmt(revenuePendiente)}
          </div>
          <div className="big-number-comp" style={{ color: 'var(--text-secondary)' }}>
            {pctCobrado}% cobrado del total
          </div>
        </div>
      </div>

      {/* ═══ STAT CARDS ROW 1 ═══ */}
      <div className="stats-grid stats-grid--4">
        <div className="stat-card">
          <div className="stat-card-icon">🛒</div>
          <div className="stat-card-value">{totalCount}</div>
          <div className="stat-card-label">Ventas totales</div>
          <div className={`stat-comp ${diffClass(totalCount, prevCount)}`}>
            {diff(totalCount, prevCount) >= 0 ? '+' : ''}{diff(totalCount, prevCount)} vs anterior
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🎯</div>
          <div className="stat-card-value">{fmt(avgTicket)}</div>
          <div className="stat-card-label">Ticket medio</div>
          <div className={`stat-comp ${diffClass(avgTicket, prevAvgTicket)}`}>
            {diff(avgTicket, prevAvgTicket) >= 0 ? '+' : ''}{fmt(diff(avgTicket, prevAvgTicket))} vs anterior
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🚀</div>
          <div className="stat-card-value">{fmt(pace)}</div>
          <div className="stat-card-label">Pace mensual</div>
          <div className="stat-card-sub">Proyección a cierre de mes</div>
        </div>
        <div className="stat-card stat-card--mini-grid">
          <div className="stat-card-label" style={{marginBottom: 12, fontWeight: 700, color: 'var(--text)'}}>Cash por producto</div>
          <div className="mini-grid">
            {Object.entries(cashByProduct).map(([prod, val], i) => (
              <div key={prod} className="mini-item">
                <span className="mini-dot" style={{background: COLORS[i % COLORS.length]}} />
                <span className="mini-label">{prod}</span>
                <span className="mini-value">{fmt(val)}</span>
              </div>
            ))}
            {Object.keys(cashByProduct).length === 0 && (
              <div className="mini-item"><span className="mini-label" style={{color: 'var(--text-muted)'}}>Sin datos</span></div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ STATUS & CUOTAS ROW ═══ */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-icon">✅</div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>{completadas}</div>
          <div className="stat-card-label">Completadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">⏳</div>
          <div className="stat-card-value" style={{ color: 'var(--warning)' }}>{pendientes}</div>
          <div className="stat-card-label">Pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🔄</div>
          <div className="stat-card-value">{cuotaSales.length}</div>
          <div className="stat-card-label">Ventas a cuotas</div>
          <div className="stat-card-sub">{cuotasPendientes} cuotas pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">↩️</div>
          <div className="stat-card-value" style={{ color: reembolsos > 0 ? 'var(--danger)' : 'var(--text)' }}>{reembolsos}</div>
          <div className="stat-card-label">Reembolsos</div>
        </div>
      </div>

      {/* ═══ LEADERBOARDS ═══ */}
      <div className="leaderboards-grid">
        <div className="leaderboard-card">
          <div className="leaderboard-header">
            <span className="leaderboard-trophy">🏆</span>
            <div>
              <h3 className="leaderboard-title">Leaderboard Closers</h3>
              <p className="leaderboard-subtitle">Ranking por Cash Neto</p>
            </div>
          </div>
          <div className="leaderboard-list">
            {closerLeaderboard.map((c, i) => (
              <div key={c.name} className={`leaderboard-row ${i === 0 ? 'leaderboard-row--first' : ''}`}>
                <div className="leaderboard-rank">{medals[i] || `#${i + 1}`}</div>
                <div className="leaderboard-avatar">{c.name.charAt(0)}</div>
                <div className="leaderboard-info">
                  <div className="leaderboard-name">{c.name}</div>
                  <div className="leaderboard-stats">{c.count} ventas &middot; {fmt(c.revenue)} revenue</div>
                </div>
                <div className="leaderboard-metrics">
                  <div className="leaderboard-metric-main">{fmt(c.cash)}</div>
                  <div className="leaderboard-metric-label">cash neto</div>
                </div>
                <div className="leaderboard-score">
                  <div className="leaderboard-score-bar">
                    <div className="leaderboard-score-fill" style={{ width: `${closerLeaderboard[0]?.cash ? (c.cash / closerLeaderboard[0].cash * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {closerLeaderboard.length === 0 && <div className="leaderboard-empty">Sin datos en este período</div>}
          </div>
        </div>

        <div className="leaderboard-card">
          <div className="leaderboard-header">
            <span className="leaderboard-trophy">🏆</span>
            <div>
              <h3 className="leaderboard-title">Leaderboard Setters</h3>
              <p className="leaderboard-subtitle">Score = Booking Rate (60%) + Volumen (40%)</p>
            </div>
          </div>
          <div className="leaderboard-list">
            {setterLeaderboard.map((s, i) => (
              <div key={s.name} className={`leaderboard-row ${i === 0 ? 'leaderboard-row--first' : ''}`}>
                <div className="leaderboard-rank">{medals[i] || `#${i + 1}`}</div>
                <div className="leaderboard-avatar">{s.name.charAt(0)}</div>
                <div className="leaderboard-info">
                  <div className="leaderboard-name">{s.name}</div>
                  <div className="leaderboard-stats">{s.conversaciones} convos &middot; {s.ofertas} ofertas &middot; {s.agendas} agendas</div>
                </div>
                <div className="leaderboard-metrics">
                  <div className="leaderboard-metric-main">{s.bookingRate}%</div>
                  <div className="leaderboard-metric-label">booking rate</div>
                </div>
                <div className="leaderboard-score">
                  <div className="leaderboard-score-bar">
                    <div className="leaderboard-score-fill" style={{ width: `${s.score}%` }} />
                  </div>
                  <span className="leaderboard-score-num">{s.score}</span>
                </div>
              </div>
            ))}
            {setterLeaderboard.length === 0 && <div className="leaderboard-empty">Sin datos en este período</div>}
          </div>
        </div>
      </div>

      {/* ═══ CHARTS ROW 1: Revenue diario + Cash acumulado ═══ */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Revenue por día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B00" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FF6B00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#666" fontSize={13} tickFormatter={d => d.slice(5)} />
              <YAxis stroke="#666" fontSize={13} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} formatter={(v) => [`€${v.toLocaleString()}`, '']} />
              <Area type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={2} fill="url(#gradRev)" />
              <Area type="monotone" dataKey="cash" stroke="#FFB800" strokeWidth={2} fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span><span className="legend-dot" style={{background:'#FF6B00'}} /> Revenue</span>
            <span><span className="legend-dot" style={{background:'#FFB800'}} /> Cash Neto</span>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Cash Acumulado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="gradCashAcum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#666" fontSize={13} tickFormatter={d => d.slice(5)} />
              <YAxis stroke="#666" fontSize={13} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} formatter={(v) => [`€${v.toLocaleString()}`, '']} />
              <Area type="monotone" dataKey="revAcum" stroke="#FF6B00" strokeWidth={2} fill="none" strokeDasharray="4 4" name="Revenue acumulado" />
              <Area type="monotone" dataKey="cashAcum" stroke="#22C55E" strokeWidth={2} fill="url(#gradCashAcum)" name="Cash acumulado" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span><span className="legend-dot" style={{background:'#FF6B00'}} /> Revenue acumulado</span>
            <span><span className="legend-dot" style={{background:'#22C55E'}} /> Cash acumulado</span>
          </div>
        </div>
      </div>

      {/* ═══ CHARTS ROW 2: Producto + Estado ═══ */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Revenue por producto</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={productData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} formatter={(v) => [`€${v.toLocaleString()}`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {productData.map((p, i) => (
              <span key={p.name}><span className="legend-dot" style={{background: COLORS[i % COLORS.length]}} /> {p.name}</span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Estado de ventas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {statusData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#666'} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {statusData.map(d => (
              <span key={d.name}><span className="legend-dot" style={{background: STATUS_COLORS[d.name] || '#666'}} /> {d.name} ({d.value})</span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CHARTS ROW 3: Closer + Método + Tipo de pago ═══ */}
      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="chart-card">
          <h3 className="chart-title">Rendimiento por Closer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={closerData} barGap={8}>
              <XAxis dataKey="name" stroke="#666" fontSize={13} />
              <YAxis stroke="#666" fontSize={13} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} formatter={(v) => [`€${v.toLocaleString()}`, '']} />
              <Bar dataKey="revenue" fill="#FF6B00" radius={[6,6,0,0]} name="Revenue" />
              <Bar dataKey="cash" fill="#22C55E" radius={[6,6,0,0]} name="Cash Neto" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Método de pago</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={methodData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {methodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {methodData.map((m, i) => (
              <span key={m.name}><span className="legend-dot" style={{background: COLORS[i % COLORS.length]}} /> {m.name}</span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Tipo de pago</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payTypeData} barGap={4}>
              <XAxis dataKey="name" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={13} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="count" fill="#FF8C3A" radius={[6,6,0,0]} name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {payTypeData.map((p, i) => (
              <span key={p.name}><span className="legend-dot" style={{background: COLORS[i % COLORS.length]}} /> {p.name}: {fmt(p.revenue)} rev</span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CHARTS ROW 4: UTM Source + País ═══ */}
      <div className="section-label-dash">Marketing & Atribución</div>
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Revenue por UTM Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utmData} barGap={4} layout="vertical">
              <XAxis type="number" stroke="#666" fontSize={13} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" stroke="#666" fontSize={12} width={80} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} formatter={(v) => [`€${v.toLocaleString()}`, '']} />
              <Bar dataKey="revenue" fill="#FF6B00" radius={[0,6,6,0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {utmData.map((u, i) => (
              <span key={u.name}><span className="legend-dot" style={{background: COLORS[i % COLORS.length]}} /> {u.name}: {u.count} ventas</span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Ventas por país</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={countryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="revenue">
                {countryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff' }} formatter={(v) => [`€${v.toLocaleString()}`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {countryData.map((c, i) => (
              <span key={c.name}><span className="legend-dot" style={{background: COLORS[i % COLORS.length]}} /> {c.name} ({c.count})</span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SETTER ATTRIBUTION TABLE ═══ */}
      {setterAttrib.length > 0 && (
        <>
          <div className="section-label-dash">Atribución por Setter</div>
          <div className="table-wrapper" style={{ marginBottom: 28 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Setter</th>
                  <th>Ventas generadas</th>
                  <th>Revenue</th>
                  <th>Cash Neto</th>
                </tr>
              </thead>
              <tbody>
                {setterAttrib.sort((a, b) => b.cash - a.cash).map(s => (
                  <tr key={s.name}>
                    <td className="cell-bold">{s.name}</td>
                    <td>{s.ventas}</td>
                    <td className="cell-money">{fmt(s.revenue)}</td>
                    <td className="cell-money" style={{ color: 'var(--success)' }}>{fmt(s.cash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ CLOSER SUMMARY TABLE ═══ */}
      <div className="section-label-dash">Resumen por Closer</div>
      <div className="table-wrapper" style={{ marginBottom: 28 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Closer</th>
              <th>Ventas</th>
              <th>Revenue</th>
              <th>Cash Neto</th>
              {[...new Set(sales.map(s => s.product))].map(p => <th key={p}>{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {closerData.map(c => (
              <tr key={c.name}>
                <td className="cell-bold">{c.name}</td>
                <td>{c.count}</td>
                <td className="cell-money">{fmt(c.revenue)}</td>
                <td className="cell-money" style={{ color: 'var(--success)' }}>{fmt(c.cash)}</td>
                {[...new Set(sales.map(s => s.product))].map(p => (
                  <td key={p}>{sales.filter(s => s.closer === c.name && s.product === p).length}</td>
                ))}
              </tr>
            ))}
            {closerData.length > 1 && (
              <tr style={{ fontWeight: 700 }}>
                <td style={{ color: 'var(--text)' }}>TOTAL</td>
                <td>{totalCount}</td>
                <td className="cell-money">{fmt(totalRevenue)}</td>
                <td className="cell-money" style={{ color: 'var(--success)' }}>{fmt(totalCash)}</td>
                {[...new Set(sales.map(s => s.product))].map(p => (
                  <td key={p}>{sales.filter(s => s.product === p).length}</td>
                ))}
              </tr>
            )}
            {closerData.length === 0 && (
              <tr><td colSpan={4} className="cell-muted" style={{ padding: 24 }}>Sin datos en este período</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ SETTER SUMMARY TABLE (from reports) ═══ */}
      <div className="section-label-dash">Resumen por Setter</div>
      <div className="table-wrapper" style={{ marginBottom: 28 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Setter</th>
              <th>Conversaciones</th>
              <th>Ofertas</th>
              <th>Agendas</th>
              <th>Booking Rate</th>
            </tr>
          </thead>
          <tbody>
            {setterLeaderboard.map(s => (
              <tr key={s.name}>
                <td className="cell-bold">{s.name}</td>
                <td>{s.conversaciones}</td>
                <td>{s.ofertas}</td>
                <td>{s.agendas}</td>
                <td style={{ color: 'var(--orange)', fontWeight: 700 }}>{s.bookingRate}%</td>
              </tr>
            ))}
            {setterLeaderboard.length === 0 && (
              <tr><td colSpan={5} className="cell-muted" style={{ padding: 24 }}>Sin datos en este período</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="dashboard-actions" style={{justifyContent: 'center', marginTop: 16}}>
        <button className="btn-action" onClick={() => navigate('/ventas/nueva')}>+ Reportar Venta</button>
        <button className="btn-action btn-action--secondary" onClick={() => navigate('/ventas/tabla')}>Ver Tabla Completa</button>
      </div>
    </div>
  )
}
