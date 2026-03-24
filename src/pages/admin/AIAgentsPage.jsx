import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || ''

const EUROPEAN_COUNTRIES = [
  'Espana', 'Portugal', 'Italia', 'Francia', 'Alemania',
  'Reino Unido', 'Paises Bajos', 'Belgica', 'Polonia', 'Turquia',
  'Rumania', 'Republica Checa', 'Austria', 'Suiza', 'Suecia', 'Bulgaria',
]

const SEARCH_PRESETS = [
  { label: 'Fabricas textiles', query: 'fabricas textiles' },
  { label: 'Textile manufacturers', query: 'textile manufacturers' },
  { label: 'Confeccion industrial', query: 'empresas de confeccion industrial' },
  { label: 'Textile mills', query: 'textile mills factory' },
  { label: 'Fabric suppliers', query: 'fabric suppliers wholesale' },
]

const PIPELINE_STEPS = [
  { key: 'search', icon: '🔍', name: 'Busqueda Multi-Fuente', desc: 'OSM + Europages + Nominatim', color: '#FF6B00' },
  { key: 'enrich', icon: '🤖', name: 'AI Enrichment', desc: 'CEO, emails, LinkedIn, sector', color: '#8B5CF6' },
  { key: 'crm', icon: '📋', name: 'CRM BlackWolf', desc: 'Insertar leads con datos', color: '#22C55E' },
  { key: 'done', icon: '✍️', name: 'Personalizacion', desc: 'Mensajes de venta (pronto)', color: '#3B82F6' },
]

const statusLabels = {
  pending: { label: 'Pendiente', color: '#FFB800' },
  idle: { label: 'Listo', color: '#555' },
  running: { label: 'En ejecucion', color: '#22C55E' },
  completed: { label: 'Completado', color: '#3B82F6' },
  failed: { label: 'Error', color: '#EF4444' },
}

const logTypeColors = { info: '#3B82F6', success: '#22C55E', warning: '#FFB800', error: '#EF4444' }

// Detect current pipeline phase from logs
function detectPhase(logs) {
  if (!logs || logs.length === 0) return null
  const lastMsg = [...logs].reverse().find(l => l.msg)?.msg || ''
  if (/completado|insertando.*leads/i.test(lastMsg)) return 'crm'
  if (/enriqueciendo|IA complet/i.test(lastMsg)) return 'enrich'
  if (/buscando|empresas encontrad/i.test(lastMsg)) return 'search'
  return 'search'
}

export default function AIAgentsPage() {
  const [activeTab, setActiveTab] = useState('config')
  const [agentStatus, setAgentStatus] = useState('idle')
  const [pipelinePhase, setPipelinePhase] = useState(null)

  const [searchQuery, setSearchQuery] = useState('fabricas textiles')
  const [selectedCountries, setSelectedCountries] = useState(['Espana', 'Portugal', 'Italia'])
  const [maxPerCountry, setMaxPerCountry] = useState(10)

  const [currentRunId, setCurrentRunId] = useState(null)
  const [logs, setLogs] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const logsEndRef = useRef(null)
  const pollRef = useRef(null)

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Update pipeline phase from logs
  useEffect(() => {
    if (agentStatus === 'running') {
      setPipelinePhase(detectPhase(logs))
    } else if (agentStatus === 'completed') {
      setPipelinePhase('done')
    } else if (agentStatus === 'idle' || agentStatus === 'failed') {
      setPipelinePhase(null)
    }
  }, [logs, agentStatus])

  useEffect(() => { loadHistory() }, [])

  // Poll for live logs
  useEffect(() => {
    if (agentStatus === 'running' && currentRunId) {
      pollRef.current = setInterval(async () => {
        try {
          const resp = await fetch(`${API}/api/agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status', clientSlug: 'black-wolf', config: { runId: currentRunId } }),
          })
          if (!resp.ok) return // silently skip failed polls
          const data = await resp.json()
          if (data.logs) setLogs(data.logs)
          if (data.status === 'completed' || data.status === 'failed') {
            setAgentStatus(data.status)
            if (data.results_summary) setResults(data.results_summary)
            clearInterval(pollRef.current)
            loadHistory()
          }
        } catch { /* ignore poll errors */ }
      }, 2000)
      return () => clearInterval(pollRef.current)
    }
  }, [agentStatus, currentRunId])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const resp = await fetch(`${API}/api/agent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'history', clientSlug: 'black-wolf' }),
      })
      if (resp.ok) { const data = await resp.json(); setHistory(data.runs || []) }
    } catch {}
    setLoadingHistory(false)
  }

  const executeSearch = async () => {
    if (selectedCountries.length === 0) { setError('Selecciona al menos un pais'); return }
    setAgentStatus('running')
    setError(null)
    setResults(null)
    setLogs([{ time: new Date().toISOString(), type: 'info', msg: 'Conectando con el agente prospector...' }])
    setActiveTab('logs')
    setPipelinePhase('search')

    try {
      const resp = await fetch(`${API}/api/agent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', clientSlug: 'black-wolf', config: { query: searchQuery, countries: selectedCountries, maxPerCountry } }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error en el agente')
      if (data.runId) setCurrentRunId(data.runId)
      setResults({ total_found: data.total, created: data.created, duplicates: data.duplicates, errors: data.errors, countries_searched: selectedCountries })
      setLogs(prev => [...prev, { time: new Date().toISOString(), type: 'success', msg: `Completado: ${data.created} leads creados en CRM BlackWolf` }])
      setAgentStatus('completed')
      loadHistory()
    } catch (err) {
      setError(err.message)
      setLogs(prev => [...prev, { time: new Date().toISOString(), type: 'error', msg: err.message }])
      setAgentStatus('failed')
    }
  }

  const executeEnrich = async () => {
    setAgentStatus('running')
    setError(null)
    setPipelinePhase('enrich')
    setLogs([{ time: new Date().toISOString(), type: 'info', msg: 'Buscando CEOs para leads existentes...' }])
    setActiveTab('logs')
    try {
      const resp = await fetch(`${API}/api/agent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enrich', clientSlug: 'black-wolf', config: { limit: 50 } }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error')
      setLogs(prev => [...prev, { time: new Date().toISOString(), type: 'success', msg: data.message }])
      setAgentStatus('completed')
    } catch (err) {
      setError(err.message)
      setLogs(prev => [...prev, { time: new Date().toISOString(), type: 'error', msg: err.message }])
      setAgentStatus('failed')
    }
  }

  const toggleCountry = (c) => setSelectedCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return '' } }
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

  // Pipeline step state
  const getStepState = (stepKey) => {
    if (!pipelinePhase) return 'idle'
    const order = ['search', 'enrich', 'crm', 'done']
    const currentIdx = order.indexOf(pipelinePhase)
    const stepIdx = order.indexOf(stepKey)
    if (stepIdx < currentIdx) return 'completed'
    if (stepIdx === currentIdx) return agentStatus === 'completed' ? 'completed' : 'active'
    return 'pending'
  }

  return (
    <div style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>Agente Prospector</h1>
          <p style={{ color: '#888', marginTop: 4, fontSize: '0.9rem' }}>Busqueda multi-fuente de fabricas textiles europeas con IA</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: `${(statusLabels[agentStatus]?.color || '#555')}22`, color: statusLabels[agentStatus]?.color || '#555' }}>
          {agentStatus === 'running' && <span className="agent-pulse">●</span>}
          {statusLabels[agentStatus]?.label || agentStatus}
        </div>
      </div>

      {/* Pipeline — lights up based on current phase */}
      <div style={{ background: '#111', border: '1px solid #1F1F1F', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <p style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Pipeline de Prospeccion</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {PIPELINE_STEPS.map((step, i, arr) => {
            const state = getStepState(step.key)
            const isActive = state === 'active'
            const isCompleted = state === 'completed'
            const isLit = isActive || isCompleted
            const borderColor = isActive ? step.color : isCompleted ? '#22C55E' : '#1F1F1F'
            const bgColor = isActive ? `${step.color}15` : isCompleted ? '#22C55E0A' : '#0A0A0A'

            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: 12, padding: '16px 20px', minWidth: 170, textAlign: 'center',
                  opacity: isLit ? 1 : 0.4,
                  transition: 'all 0.4s ease',
                  boxShadow: isActive ? `0 0 24px ${step.color}33` : 'none',
                  position: 'relative',
                }}>
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: -4, right: -4, width: 12, height: 12,
                      borderRadius: '50%', background: step.color,
                      boxShadow: `0 0 8px ${step.color}`,
                    }} className="agent-pulse" />
                  )}
                  {/* Completed check */}
                  {isCompleted && (
                    <div style={{
                      position: 'absolute', top: -4, right: -4, width: 18, height: 18,
                      borderRadius: '50%', background: '#22C55E', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#000', fontWeight: 700,
                    }}>✓</div>
                  )}
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{step.icon}</div>
                  <div style={{ color: isLit ? '#fff' : '#666', fontWeight: 600, fontSize: '0.85rem', transition: 'color 0.3s' }}>{step.name}</div>
                  <div style={{ color: isLit ? '#aaa' : '#444', fontSize: '0.7rem', marginTop: 4, transition: 'color 0.3s' }}>{step.desc}</div>
                  {isActive && (
                    <div style={{
                      marginTop: 8, padding: '2px 10px', borderRadius: 20, fontSize: '0.65rem',
                      fontWeight: 600, background: `${step.color}33`, color: step.color, display: 'inline-block',
                    }} className="agent-pulse">
                      Procesando...
                    </div>
                  )}
                </div>
                {i < arr.length - 1 && (
                  <div style={{
                    padding: '0 8px', fontSize: '1.2rem',
                    color: isCompleted ? '#22C55E' : '#333',
                    transition: 'color 0.3s',
                  }}>→</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Panel */}
      <div style={{ background: '#111', border: '1px solid #1F1F1F', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #1F1F1F', padding: '0 24px' }}>
          {[
            { key: 'config', label: 'Configuracion' },
            { key: 'logs', label: `Logs en vivo${agentStatus === 'running' ? ' ●' : ''}` },
            { key: 'results', label: 'Resultados' },
            { key: 'history', label: 'Historial' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #FF6B00' : '2px solid transparent',
              color: activeTab === tab.key ? '#fff' : (tab.key === 'logs' && agentStatus === 'running') ? '#22C55E' : '#666',
              padding: '12px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s',
            }}>{tab.label}</button>
          ))}
        </div>

        <div style={{ padding: 24 }}>

          {/* CONFIG */}
          {activeTab === 'config' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h3 style={{ color: '#FF6B00', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Busqueda Multi-Fuente</h3>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: 6 }}>Consulta de busqueda</label>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 8, color: '#fff', padding: '10px 12px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} placeholder="ej: fabricas textiles..." />
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {SEARCH_PRESETS.map(p => (
                      <button key={p.query} onClick={() => setSearchQuery(p.query)} style={{ background: searchQuery === p.query ? '#FF6B0022' : '#1a1a1a', border: `1px solid ${searchQuery === p.query ? '#FF6B00' : '#333'}`, borderRadius: 6, color: searchQuery === p.query ? '#FF6B00' : '#888', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem' }}>{p.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: 6 }}>Max resultados por pais</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[5, 10, 20, 40].map(n => (
                      <button key={n} onClick={() => setMaxPerCountry(n)} style={{ background: maxPerCountry === n ? '#FF6B0022' : '#1a1a1a', border: `1px solid ${maxPerCountry === n ? '#FF6B00' : '#333'}`, borderRadius: 6, color: maxPerCountry === n ? '#FF6B00' : '#888', padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>{n}</button>
                    ))}
                  </div>
                </div>
                {/* Sources info */}
                <div style={{ background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 8, padding: 16, marginTop: 12 }}>
                  <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 10 }}>Fuentes de datos</div>
                  {[
                    { name: 'OpenStreetMap', desc: 'Tags industriales y comerciales', color: '#22C55E' },
                    { name: 'Europages', desc: 'Directorio B2B europeo', color: '#3B82F6' },
                    { name: 'Nominatim', desc: 'Busqueda geografica libre', color: '#F59E0B' },
                  ].map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                      <span style={{ color: '#ddd', fontSize: '0.8rem', fontWeight: 500 }}>{s.name}</span>
                      <span style={{ color: '#666', fontSize: '0.7rem' }}>— {s.desc}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 8, padding: 16, marginTop: 12 }}>
                  <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 8 }}>Estimacion</div>
                  <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>~{selectedCountries.length * maxPerCountry} leads</div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginTop: 4 }}>{selectedCountries.length} paises x {maxPerCountry} por pais</div>
                </div>
              </div>
              <div>
                <h3 style={{ color: '#8B5CF6', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Paises objetivo</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EUROPEAN_COUNTRIES.map(country => {
                    const sel = selectedCountries.includes(country)
                    return <button key={country} onClick={() => toggleCountry(country)} style={{ background: sel ? '#8B5CF622' : '#0D0D0D', border: `1px solid ${sel ? '#8B5CF6' : '#1F1F1F'}`, borderRadius: 8, color: sel ? '#C4B5FD' : '#666', padding: '8px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s' }}>{sel && '✓ '}{country}</button>
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setSelectedCountries([...EUROPEAN_COUNTRIES])} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#888', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem' }}>Todos</button>
                  <button onClick={() => setSelectedCountries([])} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#888', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem' }}>Limpiar</button>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button onClick={executeSearch} disabled={agentStatus === 'running'} style={{ flex: 1, background: agentStatus === 'running' ? '#333' : 'linear-gradient(135deg, #FF6B00, #FFB800)', border: 'none', borderRadius: 10, color: agentStatus === 'running' ? '#666' : '#000', fontWeight: 700, padding: '14px 24px', cursor: agentStatus === 'running' ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
                    {agentStatus === 'running' ? '⏳ Ejecutando...' : '🔍 Buscar Leads'}
                  </button>
                  <button onClick={executeEnrich} disabled={agentStatus === 'running'} style={{ background: agentStatus === 'running' ? '#333' : '#8B5CF622', border: `1px solid ${agentStatus === 'running' ? '#333' : '#8B5CF6'}`, borderRadius: 10, color: agentStatus === 'running' ? '#666' : '#C4B5FD', fontWeight: 600, padding: '14px 20px', cursor: agentStatus === 'running' ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                    🤖 Re-enriquecer
                  </button>
                </div>
                {error && <div style={{ background: '#EF444422', border: '1px solid #EF4444', borderRadius: 8, padding: 12, marginTop: 12, color: '#FCA5A5', fontSize: '0.85rem' }}>{error}</div>}
              </div>
            </div>
          )}

          {/* LOGS — live feed */}
          {activeTab === 'logs' && (
            logs.length === 0
              ? <div style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: '0.9rem' }}>No hay logs. Ejecuta una busqueda para ver actividad en tiempo real.</div>
              : <div style={{ background: '#0A0A0A', borderRadius: 8, padding: 16, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.78rem', maxHeight: 500, overflowY: 'auto' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ padding: '5px 0', display: 'flex', gap: 12, borderLeft: `2px solid ${logTypeColors[log.type] || '#333'}`, paddingLeft: 12, marginBottom: 2 }}>
                      <span style={{ color: '#555', minWidth: 65, flexShrink: 0 }}>{fmtTime(log.time)}</span>
                      <span style={{ color: logTypeColors[log.type] || '#888', fontWeight: 700, minWidth: 55, textTransform: 'uppercase', fontSize: '0.65rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : log.type === 'warning' ? '!' : '›'} {log.type}
                      </span>
                      <span style={{ color: log.type === 'error' ? '#FCA5A5' : log.type === 'success' ? '#86EFAC' : '#ccc' }}>{log.msg}</span>
                    </div>
                  ))}
                  {agentStatus === 'running' && (
                    <div style={{ padding: '8px 0 4px 14px', color: '#FF6B00' }} className="agent-pulse">▌ Procesando...</div>
                  )}
                  <div ref={logsEndRef} />
                </div>
          )}

          {/* RESULTS */}
          {activeTab === 'results' && (
            !results
              ? <div style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: '0.9rem' }}>Ejecuta una busqueda primero.</div>
              : <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                      { label: 'Total encontrados', value: results.total_found, color: '#FF6B00' },
                      { label: 'Leads creados', value: results.created, color: '#22C55E' },
                      { label: 'Duplicados', value: results.duplicates, color: '#FFB800' },
                      { label: 'Errores', value: results.errors, color: '#EF4444' },
                    ].map(c => (
                      <div key={c.label} style={{ background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                        <div style={{ color: c.color, fontSize: '2rem', fontWeight: 700 }}>{c.value}</div>
                        <div style={{ color: '#666', fontSize: '0.75rem', marginTop: 4 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                  {results.countries_searched && (
                    <div style={{ background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 8, padding: 16 }}>
                      <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 8 }}>Paises buscados</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {results.countries_searched.map(c => <span key={c} style={{ background: '#22C55E22', color: '#22C55E', padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 500 }}>{c}</span>)}
                      </div>
                    </div>
                  )}
                  <div style={{ background: '#22C55E11', border: '1px solid #22C55E33', borderRadius: 8, padding: 16, marginTop: 16, color: '#86EFAC', fontSize: '0.85rem' }}>
                    Leads insertados en CRM BlackWolf con email, telefono, web, pais y LinkedIn en sus campos correspondientes. Ve a Consola Central → BlackWolf → CRM para verlos.
                  </div>
                </div>
          )}

          {/* HISTORY */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={loadHistory} disabled={loadingHistory} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#888', padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem' }}>{loadingHistory ? 'Cargando...' : '↻ Actualizar'}</button>
              </div>
              {history.length === 0
                ? <div style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: '0.9rem' }}>{loadingHistory ? 'Cargando...' : 'Sin ejecuciones.'}</div>
                : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1F1F1F' }}>
                        {['ID', 'Fecha', 'Encontrados', 'Creados', 'Duplicados', 'Estado'].map(h => (
                          <th key={h} style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(run => {
                        const s = run.results_summary || {}
                        return (
                          <tr key={run.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <td style={{ padding: '10px 12px', color: '#aaa', fontSize: '0.8rem', fontFamily: 'monospace' }}>{run.id?.slice(0, 8)}</td>
                            <td style={{ padding: '10px 12px', color: '#ddd', fontSize: '0.85rem' }}>{fmtDate(run.created_at)}</td>
                            <td style={{ padding: '10px 12px', color: '#FF6B00', fontSize: '0.85rem', fontWeight: 600 }}>{s.total_found ?? '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#22C55E', fontSize: '0.85rem', fontWeight: 600 }}>{s.created ?? '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#FFB800', fontSize: '0.85rem' }}>{s.duplicates ?? '—'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: `${statusLabels[run.status]?.color || '#555'}22`, color: statusLabels[run.status]?.color || '#555' }}>{statusLabels[run.status]?.label || run.status}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
              }
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes agentPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .agent-pulse {
          animation: agentPulse 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
