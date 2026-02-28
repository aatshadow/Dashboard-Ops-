import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import Filters, { FilterSelect, getDateRange, getPreviousRange, dateInRange } from '../components/Filters'
import { getReports, getSalesWithNetCash } from '../utils/data'
import { useAsync } from '../hooks/useAsync'

const COLORS = ['#FF6B00', '#FFB800', '#FF8C3A', '#FFD060', '#E55A00']

/* ─── Flip Stat Card ─── */
function FlipStatCard({ id, icon, value, label, sub, compClass, compText, flipped, onFlip, sparkData, sparkKey, color }) {
  return (
    <div className={`flip-card-wrap ${flipped ? 'flip-card--flipped' : ''}`} onClick={() => onFlip(id)}>
      <div className="flip-card-inner">
        <div className="flip-card-front stat-card">
          <div className="stat-card-icon">{icon}</div>
          <div className="stat-card-value">{value}</div>
          <div className="stat-card-label">{label}</div>
          {sub && <div className="stat-card-sub">{sub}</div>}
          {compText && <div className={`stat-comp ${compClass || ''}`}>{compText}</div>}
        </div>
        <div className="flip-card-back stat-card">
          <div className="flip-back-title">{label}</div>
          <div className="flip-back-chart">
            {sparkData && sparkData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color || '#FF6B00'} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={color || '#FF6B00'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff', fontSize: 11, padding: '6px 10px' }}
                    formatter={(v) => [typeof v === 'number' && sparkKey.toLowerCase().includes('rate') ? `${v}%` : v, '']}
                    labelFormatter={l => l ? l.slice(5) : ''}
                  />
                  <Area type="monotone" dataKey={sparkKey} stroke={color || '#FF6B00'} strokeWidth={2} fill={`url(#spark-${id})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flip-back-empty">Sin datos</div>
            )}
          </div>
          <div className="flip-back-hint">Clic para volver</div>
        </div>
      </div>
    </div>
  )
}

export default function ReportsDashboard() {
  const navigate = useNavigate()
  const [allReports, reportsLoading] = useAsync(getReports, [])
  const [allSales, salesLoading] = useAsync(getSalesWithNetCash, [])

  const [datePreset, setDatePreset] = useState('thisMonth')
  const [setterFilter, setSetterFilter] = useState('')
  const [closerFilter, setCloserFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [flippedCards, setFlippedCards] = useState(new Set())

  // Available filter options
  const setterNames = [...new Set(allReports.filter(r => r.role === 'setter').map(r => r.name))]
  const closerNames = [...new Set(allReports.filter(r => r.role === 'closer').map(r => r.name))]
  const products = [...new Set(allSales.map(s => s.product))]

  const range = getDateRange(datePreset)
  const prevRange = getPreviousRange(datePreset)

  // Sales in current range for summary tables
  const salesInRange = allSales.filter(s => dateInRange(s.date, range))
  const fmt = v => v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  // Current & prev period reports
  const currentReports = allReports.filter(r => dateInRange(r.date, range))
  const prevReportsAll = allReports.filter(r => dateInRange(r.date, prevRange))

  // Apply person filters
  const setters = currentReports.filter(r => r.role === 'setter' && (!setterFilter || r.name === setterFilter))
  const closers = currentReports.filter(r => r.role === 'closer' && (!closerFilter || r.name === closerFilter))
  const prevSetters = prevReportsAll.filter(r => r.role === 'setter' && (!setterFilter || r.name === setterFilter))
  const prevClosers = prevReportsAll.filter(r => r.role === 'closer' && (!closerFilter || r.name === closerFilter))

  // Section visibility: selecting only one hides the other
  const showSetters = !closerFilter || setterFilter
  const showClosers = !setterFilter || closerFilter
  const showLeaderboards = !setterFilter && !closerFilter

  /* ════════════ SETTER METRICS ════════════ */
  const totalConvos = setters.reduce((s, r) => s + r.conversationsOpened, 0)
  const totalFollowUps = setters.reduce((s, r) => s + r.followUps, 0)
  const totalSetterOffers = setters.reduce((s, r) => s + r.offersLaunched, 0)
  const totalAppointments = setters.reduce((s, r) => s + r.appointmentsBooked, 0)

  const prevConvos = prevSetters.reduce((s, r) => s + r.conversationsOpened, 0)
  const prevFollowUps = prevSetters.reduce((s, r) => s + r.followUps, 0)
  const prevSetterOffers = prevSetters.reduce((s, r) => s + r.offersLaunched, 0)
  const prevAppointments = prevSetters.reduce((s, r) => s + r.appointmentsBooked, 0)

  // Setter ratios
  const setterOfertasRate = totalConvos ? Math.round(totalSetterOffers / totalConvos * 100) : 0
  const agendasFromOfertas = totalSetterOffers ? Math.round(totalAppointments / totalSetterOffers * 100) : 0
  const bookingRate = totalConvos ? Math.round(totalAppointments / totalConvos * 100) : 0

  const prevSetterOfertasRate = prevConvos ? Math.round(prevSetterOffers / prevConvos * 100) : 0
  const prevAgendasFromOfertas = prevSetterOffers ? Math.round(prevAppointments / prevSetterOffers * 100) : 0
  const prevBookingRate = prevConvos ? Math.round(prevAppointments / prevConvos * 100) : 0

  /* ════════════ CLOSER METRICS ════════════ */
  const totalScheduled = closers.reduce((s, r) => s + r.scheduledCalls, 0)
  const totalCalls = closers.reduce((s, r) => s + r.callsMade, 0)
  const totalCloserOffers = closers.reduce((s, r) => s + r.offersLaunched, 0)
  const totalDeposits = closers.reduce((s, r) => s + r.deposits, 0)
  const totalCloses = closers.reduce((s, r) => s + r.closes, 0)

  const prevScheduled = prevClosers.reduce((s, r) => s + r.scheduledCalls, 0)
  const prevCalls = prevClosers.reduce((s, r) => s + r.callsMade, 0)
  const prevCloserOffers = prevClosers.reduce((s, r) => s + r.offersLaunched, 0)
  const prevDeposits = prevClosers.reduce((s, r) => s + r.deposits, 0)
  const prevCloses = prevClosers.reduce((s, r) => s + r.closes, 0)

  // Closer ratios
  const showRate = totalScheduled ? Math.round(totalCalls / totalScheduled * 100) : 0
  const closerOfertaRate = totalCalls ? Math.round(totalCloserOffers / totalCalls * 100) : 0
  const closeRate = totalCalls ? Math.round(totalCloses / totalCalls * 100) : 0

  const prevShowRate = prevScheduled ? Math.round(prevCalls / prevScheduled * 100) : 0
  const prevCloserOfertaRate = prevCalls ? Math.round(prevCloserOffers / prevCalls * 100) : 0
  const prevCloseRate = prevCalls ? Math.round(prevCloses / prevCalls * 100) : 0

  /* ════════════ DAILY DATA (for sparklines & charts) ════════════ */
  // Setter daily
  const setterDailyMap = setters.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = { date: r.date, conversaciones: 0, followUps: 0, ofertas: 0, agendas: 0 }
    acc[r.date].conversaciones += r.conversationsOpened
    acc[r.date].followUps += r.followUps
    acc[r.date].ofertas += r.offersLaunched
    acc[r.date].agendas += r.appointmentsBooked
    return acc
  }, {})
  const setterDaily = Object.values(setterDailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      ofertasRate: d.conversaciones ? Math.round(d.ofertas / d.conversaciones * 100) : 0,
      agendasFromOfertasRate: d.ofertas ? Math.round(d.agendas / d.ofertas * 100) : 0,
      bookingRate: d.conversaciones ? Math.round(d.agendas / d.conversaciones * 100) : 0,
    }))

  // Closer daily
  const closerDailyMap = closers.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = { date: r.date, agendadas: 0, llamadas: 0, ofertas: 0, depositos: 0, cierres: 0 }
    acc[r.date].agendadas += r.scheduledCalls
    acc[r.date].llamadas += r.callsMade
    acc[r.date].ofertas += r.offersLaunched
    acc[r.date].depositos += r.deposits
    acc[r.date].cierres += r.closes
    return acc
  }, {})
  const closerDaily = Object.values(closerDailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      showRate: d.agendadas ? Math.round(d.llamadas / d.agendadas * 100) : 0,
      ofertaRate: d.llamadas ? Math.round(d.ofertas / d.llamadas * 100) : 0,
      closeRate: d.llamadas ? Math.round(d.cierres / d.llamadas * 100) : 0,
    }))

  /* ════════════ BY PERSON (for bar charts) ════════════ */
  const setterByPerson = Object.values(setters.reduce((acc, r) => {
    if (!acc[r.name]) acc[r.name] = { name: r.name, conversaciones: 0, followUps: 0, ofertas: 0, agendas: 0 }
    acc[r.name].conversaciones += r.conversationsOpened
    acc[r.name].followUps += r.followUps
    acc[r.name].ofertas += r.offersLaunched
    acc[r.name].agendas += r.appointmentsBooked
    return acc
  }, {}))

  const closerByPerson = Object.values(closers.reduce((acc, r) => {
    if (!acc[r.name]) acc[r.name] = { name: r.name, llamadas: 0, ofertas: 0, cierres: 0 }
    acc[r.name].llamadas += r.callsMade
    acc[r.name].ofertas += r.offersLaunched
    acc[r.name].cierres += r.closes
    return acc
  }, {}))

  /* ════════════ LEADERBOARDS ════════════ */
  const closerLeaderboard = (() => {
    if (closerByPerson.length === 0) return []
    const maxCalls = Math.max(...closerByPerson.map(d => d.llamadas), 1)
    return closerByPerson.map(d => {
      const cr = d.llamadas ? (d.cierres / d.llamadas * 100) : 0
      const volNorm = d.llamadas / maxCalls * 100
      const score = cr * 0.6 + volNorm * 0.4
      return { ...d, closeRate: Math.round(cr), score: Math.round(score) }
    }).sort((a, b) => b.score - a.score)
  })()

  const setterLeaderboard = (() => {
    if (setterByPerson.length === 0) return []
    const maxConvos = Math.max(...setterByPerson.map(d => d.conversaciones), 1)
    return setterByPerson.map(d => {
      const br = d.conversaciones ? (d.agendas / d.conversaciones * 100) : 0
      const volNorm = d.conversaciones / maxConvos * 100
      const score = br * 0.6 + volNorm * 0.4
      return { ...d, bookingRate: Math.round(br), score: Math.round(score) }
    }).sort((a, b) => b.score - a.score)
  })()

  /* ════════════ HELPERS ════════════ */
  const diff = (curr, prev) => curr - prev
  const dc = (curr, prev) => curr >= prev ? 'comp--up' : 'comp--down'
  const ct = (curr, prev, suffix = '') => `${diff(curr, prev) >= 0 ? '+' : ''}${diff(curr, prev)}${suffix} vs anterior`
  const medals = ['🥇', '🥈', '🥉']

  const toggleFlip = (cardId) => {
    setFlippedCards(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  if (reportsLoading || salesLoading) return <div className="dashboard"><div style={{textAlign:'center',padding:60,color:'#999'}}>Cargando datos...</div></div>

  return (
    <div className="dashboard">
      {/* FILTERS */}
      <Filters
        datePreset={datePreset}
        onDatePreset={setDatePreset}
        extras={
          <>
            <FilterSelect label="Setter" value={setterFilter} onChange={setSetterFilter} options={setterNames} />
            <FilterSelect label="Closer" value={closerFilter} onChange={setCloserFilter} options={closerNames} />
            <FilterSelect label="Producto" value={productFilter} onChange={setProductFilter} options={products} />
          </>
        }
      />

      {/* ═══ LEADERBOARDS ═══ */}
      {showLeaderboards && (
        <div className="leaderboards-grid">
          <div className="leaderboard-card">
            <div className="leaderboard-header">
              <span className="leaderboard-trophy">🏆</span>
              <div>
                <h3 className="leaderboard-title">Leaderboard Closers</h3>
                <p className="leaderboard-subtitle">Score = Close Rate (60%) + Volumen (40%)</p>
              </div>
            </div>
            <div className="leaderboard-list">
              {closerLeaderboard.map((c, i) => (
                <div key={c.name} className={`leaderboard-row ${i === 0 ? 'leaderboard-row--first' : ''}`}>
                  <div className="leaderboard-rank">{medals[i] || `#${i + 1}`}</div>
                  <div className="leaderboard-avatar">{c.name.charAt(0)}</div>
                  <div className="leaderboard-info">
                    <div className="leaderboard-name">{c.name}</div>
                    <div className="leaderboard-stats">{c.llamadas} llamadas &middot; {c.cierres} cierres &middot; {c.ofertas} ofertas</div>
                  </div>
                  <div className="leaderboard-metrics">
                    <div className="leaderboard-metric-main">{c.closeRate}%</div>
                    <div className="leaderboard-metric-label">close rate</div>
                  </div>
                  <div className="leaderboard-score">
                    <div className="leaderboard-score-bar">
                      <div className="leaderboard-score-fill" style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="leaderboard-score-num">{c.score}</span>
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
      )}

      {/* ═══════════ SETTERS ═══════════ */}
      {showSetters && (
        <>
          <div className="section-label-dash">Setters</div>
          <div className="stats-grid stats-grid--4">
            <FlipStatCard id="s-convos" icon="💬" value={totalConvos} label="Conversaciones"
              compClass={dc(totalConvos, prevConvos)} compText={ct(totalConvos, prevConvos)}
              flipped={flippedCards.has('s-convos')} onFlip={toggleFlip}
              sparkData={setterDaily} sparkKey="conversaciones" />
            <FlipStatCard id="s-followups" icon="🔄" value={totalFollowUps} label="Follow Ups"
              compClass={dc(totalFollowUps, prevFollowUps)} compText={ct(totalFollowUps, prevFollowUps)}
              flipped={flippedCards.has('s-followups')} onFlip={toggleFlip}
              sparkData={setterDaily} sparkKey="followUps" />
            <FlipStatCard id="s-ofertas" icon="📨" value={totalSetterOffers} label="Ofertas"
              compClass={dc(totalSetterOffers, prevSetterOffers)} compText={ct(totalSetterOffers, prevSetterOffers)}
              flipped={flippedCards.has('s-ofertas')} onFlip={toggleFlip}
              sparkData={setterDaily} sparkKey="ofertas" />
            <FlipStatCard id="s-agendas" icon="📅" value={totalAppointments} label="Agendas"
              compClass={dc(totalAppointments, prevAppointments)} compText={ct(totalAppointments, prevAppointments)}
              flipped={flippedCards.has('s-agendas')} onFlip={toggleFlip}
              sparkData={setterDaily} sparkKey="agendas" />
          </div>

          <div className="section-label-dash" style={{marginTop: 8}}>Ratios Setters</div>
          <div className="stats-grid stats-grid--3">
            <FlipStatCard id="s-ofertasRate" icon="📊" value={`${setterOfertasRate}%`} label="% Ofertas / Convos"
              sub={`${totalSetterOffers}/${totalConvos}`}
              compClass={dc(setterOfertasRate, prevSetterOfertasRate)} compText={ct(setterOfertasRate, prevSetterOfertasRate, '%')}
              flipped={flippedCards.has('s-ofertasRate')} onFlip={toggleFlip}
              sparkData={setterDaily} sparkKey="ofertasRate" color="#FFB800" />
            <FlipStatCard id="s-agendasOfertas" icon="📊" value={`${agendasFromOfertas}%`} label="% Agendas / Ofertas"
              sub={`${totalAppointments}/${totalSetterOffers}`}
              compClass={dc(agendasFromOfertas, prevAgendasFromOfertas)} compText={ct(agendasFromOfertas, prevAgendasFromOfertas, '%')}
              flipped={flippedCards.has('s-agendasOfertas')} onFlip={toggleFlip}
              sparkData={setterDaily} sparkKey="agendasFromOfertasRate" color="#FF8C3A" />
            <FlipStatCard id="s-bookingRate" icon="🎯" value={`${bookingRate}%`} label="% Agendas / Convos"
              sub={`${totalAppointments}/${totalConvos}`}
              compClass={dc(bookingRate, prevBookingRate)} compText={ct(bookingRate, prevBookingRate, '%')}
              flipped={flippedCards.has('s-bookingRate')} onFlip={toggleFlip}
              sparkData={setterDaily} sparkKey="bookingRate" color="#FF6B00" />
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title">Actividad Setters por día</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={setterDaily} barGap={2}>
                  <XAxis dataKey="date" stroke="#666" fontSize={13} tickFormatter={d => d.slice(5)} />
                  <YAxis stroke="#666" fontSize={13} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                  <Bar dataKey="conversaciones" fill="#FF6B00" radius={[4,4,0,0]} />
                  <Bar dataKey="ofertas" fill="#FFB800" radius={[4,4,0,0]} />
                  <Bar dataKey="agendas" fill="#FF8C3A" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span><span className="legend-dot" style={{background:'#FF6B00'}} /> Conversaciones</span>
                <span><span className="legend-dot" style={{background:'#FFB800'}} /> Ofertas</span>
                <span><span className="legend-dot" style={{background:'#FF8C3A'}} /> Agendas</span>
              </div>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Rendimiento por Setter</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={setterByPerson} barGap={4}>
                  <XAxis dataKey="name" stroke="#666" fontSize={13} />
                  <YAxis stroke="#666" fontSize={13} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                  <Bar dataKey="conversaciones" fill="#FF6B00" radius={[4,4,0,0]} />
                  <Bar dataKey="ofertas" fill="#FFB800" radius={[4,4,0,0]} />
                  <Bar dataKey="agendas" fill="#FF8C3A" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span><span className="legend-dot" style={{background:'#FF6B00'}} /> Conversaciones</span>
                <span><span className="legend-dot" style={{background:'#FFB800'}} /> Ofertas</span>
                <span><span className="legend-dot" style={{background:'#FF8C3A'}} /> Agendas</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ CLOSERS ═══════════ */}
      {showClosers && (
        <>
          <div className="section-label-dash">Closers</div>
          <div className="stats-grid stats-grid--5">
            <FlipStatCard id="c-agendadas" icon="📅" value={totalScheduled} label="Agendadas"
              compClass={dc(totalScheduled, prevScheduled)} compText={ct(totalScheduled, prevScheduled)}
              flipped={flippedCards.has('c-agendadas')} onFlip={toggleFlip}
              sparkData={closerDaily} sparkKey="agendadas" />
            <FlipStatCard id="c-realizadas" icon="📞" value={totalCalls} label="Realizadas"
              compClass={dc(totalCalls, prevCalls)} compText={ct(totalCalls, prevCalls)}
              flipped={flippedCards.has('c-realizadas')} onFlip={toggleFlip}
              sparkData={closerDaily} sparkKey="llamadas" />
            <FlipStatCard id="c-ofertas" icon="📨" value={totalCloserOffers} label="Ofertas"
              compClass={dc(totalCloserOffers, prevCloserOffers)} compText={ct(totalCloserOffers, prevCloserOffers)}
              flipped={flippedCards.has('c-ofertas')} onFlip={toggleFlip}
              sparkData={closerDaily} sparkKey="ofertas" />
            <FlipStatCard id="c-depositos" icon="💳" value={totalDeposits} label="Depósitos"
              compClass={dc(totalDeposits, prevDeposits)} compText={ct(totalDeposits, prevDeposits)}
              flipped={flippedCards.has('c-depositos')} onFlip={toggleFlip}
              sparkData={closerDaily} sparkKey="depositos" />
            <FlipStatCard id="c-cierres" icon="✅" value={totalCloses} label="Cierres"
              compClass={dc(totalCloses, prevCloses)} compText={ct(totalCloses, prevCloses)}
              flipped={flippedCards.has('c-cierres')} onFlip={toggleFlip}
              sparkData={closerDaily} sparkKey="cierres" />
          </div>

          <div className="section-label-dash" style={{marginTop: 8}}>Ratios Closers</div>
          <div className="stats-grid stats-grid--3">
            <FlipStatCard id="c-showRate" icon="📊" value={`${showRate}%`} label="Show Rate"
              sub={`${totalCalls}/${totalScheduled} shows`}
              compClass={dc(showRate, prevShowRate)} compText={ct(showRate, prevShowRate, '%')}
              flipped={flippedCards.has('c-showRate')} onFlip={toggleFlip}
              sparkData={closerDaily} sparkKey="showRate" color="#FFB800" />
            <FlipStatCard id="c-ofertaRate" icon="📊" value={`${closerOfertaRate}%`} label="% Ofertas / Llamadas"
              sub={`${totalCloserOffers}/${totalCalls} ofertas`}
              compClass={dc(closerOfertaRate, prevCloserOfertaRate)} compText={ct(closerOfertaRate, prevCloserOfertaRate, '%')}
              flipped={flippedCards.has('c-ofertaRate')} onFlip={toggleFlip}
              sparkData={closerDaily} sparkKey="ofertaRate" color="#FF8C3A" />
            <FlipStatCard id="c-closeRate" icon="🎯" value={`${closeRate}%`} label="Close Rate"
              sub={`${totalCloses}/${totalCalls} cierres`}
              compClass={dc(closeRate, prevCloseRate)} compText={ct(closeRate, prevCloseRate, '%')}
              flipped={flippedCards.has('c-closeRate')} onFlip={toggleFlip}
              sparkData={closerDaily} sparkKey="closeRate" color="#FF6B00" />
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title">Actividad Closers por día</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={closerDaily} barGap={2}>
                  <XAxis dataKey="date" stroke="#666" fontSize={13} tickFormatter={d => d.slice(5)} />
                  <YAxis stroke="#666" fontSize={13} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                  <Bar dataKey="llamadas" fill="#FF6B00" radius={[4,4,0,0]} />
                  <Bar dataKey="ofertas" fill="#FFB800" radius={[4,4,0,0]} />
                  <Bar dataKey="cierres" fill="#FF8C3A" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span><span className="legend-dot" style={{background:'#FF6B00'}} /> Llamadas</span>
                <span><span className="legend-dot" style={{background:'#FFB800'}} /> Ofertas</span>
                <span><span className="legend-dot" style={{background:'#FF8C3A'}} /> Cierres</span>
              </div>
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Rendimiento por Closer</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={closerByPerson} barGap={4}>
                  <XAxis dataKey="name" stroke="#666" fontSize={13} />
                  <YAxis stroke="#666" fontSize={13} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                  <Bar dataKey="llamadas" fill="#FF6B00" radius={[4,4,0,0]} />
                  <Bar dataKey="ofertas" fill="#FFB800" radius={[4,4,0,0]} />
                  <Bar dataKey="cierres" fill="#FF8C3A" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span><span className="legend-dot" style={{background:'#FF6B00'}} /> Llamadas</span>
                <span><span className="legend-dot" style={{background:'#FFB800'}} /> Ofertas</span>
                <span><span className="legend-dot" style={{background:'#FF8C3A'}} /> Cierres</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ RESUMEN POR CLOSER ═══ */}
      {showClosers && (
        <>
          <div className="section-label-dash" style={{marginTop: 24}}>Resumen por Closer</div>
          <div className="table-wrapper" style={{ marginBottom: 28 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Agendadas</th>
                  <th>Llamadas</th>
                  <th>Ofertas</th>
                  <th>Depósitos</th>
                  <th>Cierres</th>
                  <th>Show Rate</th>
                  <th>Close Rate</th>
                  <th>Ventas</th>
                  <th>Revenue</th>
                  <th>Cash Neto</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const names = [...new Set(closers.map(r => r.name))]
                  if (names.length === 0) return <tr><td colSpan={11} style={{textAlign:'center',opacity:.5}}>Sin datos</td></tr>
                  let totAgendadas = 0, totLlamadas = 0, totOfertas = 0, totDepos = 0, totCierres = 0, totVentas = 0, totRev = 0, totCash = 0
                  const rows = names.map(name => {
                    const reps = closers.filter(r => r.name === name)
                    const agendadas = reps.reduce((s, r) => s + r.scheduledCalls, 0)
                    const llamadas = reps.reduce((s, r) => s + r.callsMade, 0)
                    const ofertas = reps.reduce((s, r) => s + r.offersLaunched, 0)
                    const depos = reps.reduce((s, r) => s + r.deposits, 0)
                    const cierres = reps.reduce((s, r) => s + r.closes, 0)
                    const sr = agendadas ? Math.round(llamadas / agendadas * 100) : 0
                    const cr = llamadas ? Math.round(cierres / llamadas * 100) : 0
                    const mySales = salesInRange.filter(s => s.closer === name)
                    const ventas = mySales.length
                    const rev = mySales.reduce((s, x) => s + x.revenue, 0)
                    const cash = mySales.reduce((s, x) => s + x.netCash, 0)
                    totAgendadas += agendadas; totLlamadas += llamadas; totOfertas += ofertas; totDepos += depos; totCierres += cierres
                    totVentas += ventas; totRev += rev; totCash += cash
                    return (
                      <tr key={name}>
                        <td><strong>{name}</strong></td>
                        <td>{agendadas}</td>
                        <td>{llamadas}</td>
                        <td>{ofertas}</td>
                        <td>{depos}</td>
                        <td>{cierres}</td>
                        <td>{sr}%</td>
                        <td>{cr}%</td>
                        <td>{ventas}</td>
                        <td>€{fmt(rev)}</td>
                        <td style={{color:'#4ade80'}}>€{fmt(cash)}</td>
                      </tr>
                    )
                  })
                  const totSR = totAgendadas ? Math.round(totLlamadas / totAgendadas * 100) : 0
                  const totCR = totLlamadas ? Math.round(totCierres / totLlamadas * 100) : 0
                  return [...rows, (
                    <tr key="_total" style={{fontWeight: 700, borderTop: '2px solid #333'}}>
                      <td>TOTAL</td>
                      <td>{totAgendadas}</td>
                      <td>{totLlamadas}</td>
                      <td>{totOfertas}</td>
                      <td>{totDepos}</td>
                      <td>{totCierres}</td>
                      <td>{totSR}%</td>
                      <td>{totCR}%</td>
                      <td>{totVentas}</td>
                      <td>€{fmt(totRev)}</td>
                      <td style={{color:'#4ade80'}}>€{fmt(totCash)}</td>
                    </tr>
                  )]
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ RESUMEN POR SETTER ═══ */}
      {showSetters && (
        <>
          <div className="section-label-dash" style={{marginTop: 24}}>Resumen por Setter</div>
          <div className="table-wrapper" style={{ marginBottom: 28 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Conversaciones</th>
                  <th>Follow Ups</th>
                  <th>Ofertas</th>
                  <th>Agendas</th>
                  <th>% Ofertas</th>
                  <th>Booking Rate</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (setterByPerson.length === 0) return <tr><td colSpan={7} style={{textAlign:'center',opacity:.5}}>Sin datos</td></tr>
                  let totC = 0, totF = 0, totO = 0, totA = 0
                  const rows = setterByPerson.map(s => {
                    const or = s.conversaciones ? Math.round(s.ofertas / s.conversaciones * 100) : 0
                    const br = s.conversaciones ? Math.round(s.agendas / s.conversaciones * 100) : 0
                    totC += s.conversaciones; totF += s.followUps; totO += s.ofertas; totA += s.agendas
                    return (
                      <tr key={s.name}>
                        <td><strong>{s.name}</strong></td>
                        <td>{s.conversaciones}</td>
                        <td>{s.followUps}</td>
                        <td>{s.ofertas}</td>
                        <td>{s.agendas}</td>
                        <td>{or}%</td>
                        <td>{br}%</td>
                      </tr>
                    )
                  })
                  const totOR = totC ? Math.round(totO / totC * 100) : 0
                  const totBR = totC ? Math.round(totA / totC * 100) : 0
                  return [...rows, (
                    <tr key="_total" style={{fontWeight: 700, borderTop: '2px solid #333'}}>
                      <td>TOTAL</td>
                      <td>{totC}</td>
                      <td>{totF}</td>
                      <td>{totO}</td>
                      <td>{totA}</td>
                      <td>{totOR}%</td>
                      <td>{totBR}%</td>
                    </tr>
                  )]
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="dashboard-actions" style={{justifyContent: 'center', marginTop: 16}}>
        <button className="btn-action" onClick={() => navigate('/reportes/nuevo')}>+ EOD Report</button>
        <button className="btn-action btn-action--secondary" onClick={() => navigate('/reportes/tabla')}>Ver Tabla Completa</button>
      </div>
    </div>
  )
}
