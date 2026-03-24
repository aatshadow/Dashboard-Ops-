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

const statusLabels = {
  pending: { label: 'Pendiente', color: '#FFB800' },
  idle: { label: 'Inactivo', color: '#555' },
  running: { label: 'En ejecucion', color: '#22C55E' },
  completed: { label: 'Completado', color: '#3B82F6' },
  failed: { label: 'Error', color: '#EF4444' },
  cancelled: { label: 'Cancelado', color: '#888' },
}

const logTypeColors = {
  info: '#3B82F6',
  success: '#22C55E',
  warning: '#FFB800',
  error: '#EF4444',
}

export default function AIAgentsPage() {
  const [activeTab, setActiveTab] = useState('config')
  const [agentStatus, setAgentStatus] = useState('idle')

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

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    if (agentStatus === 'running' && currentRunId) {
      pollRef.current = setInterval(async () => {
        try {
          const resp = await fetch(`${API}/api/agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status', clientSlug: 'black-wolf', config: { runId: currentRunId } }),
          })
          const data = await resp.json()
          if (data.logs) setLogs(data.logs)
          if (data.status === 'completed' || data.status === 'failed') {
            setAgentStatus(data.status)
            if (data.results_summary) setResults(data.results_summary)
            clearInterval(pollRef.current)
            loadHistory()
          }
        } catch {}
      }, 3000)
      return () => clearInterval(pollRef.current)
    }
  }, [agentStatus, currentRunId])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const resp = await fetch(`${API}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'history', clientSlug: 'black-wolf' }),
      })
      const data = await resp.json()
      setHistory(data.runs || [])
    } catch {}
    setLoadingHistory(false)
  }

  const executeSearch = async () => {
    if (selectedCountries.length === 0) { setError('Selecciona al menos un pais'); return }
    setAgentStatus('running')
    setError(null)
    setResults(null)
    setLogs([{ time: new Date().toISOString(), type: 'info', msg: 'Enviando solicitud al agente...' }])
    setActiveTab('logs')

    try {
      const resp = await fetch(`${API}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          clientSlug: 'black-wolf',
          config: { query: searchQuery, countries: selectedCountries, maxPerCountry },
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error en el agente')
      if (data.runId) setCurrentRunId(data.runId)
      setResults({ total_found: data.total, created: data.created, duplicates: data.duplicates, errors: data.errors })
      setLogs(prev => [...prev, { time: new Date().toISOString(), type: 'success', msg: `Completado: ${data.created} leads creados, ${data.duplicates} duplicados` }])
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
    setLogs([{ time: new Date().toISOString(), type: 'info', msg: 'Buscando CEOs para leads existentes...' }])
    setActiveTab('logs')
    try {
      const resp = await fetch(`${API}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const toggleCountry = (country) => {
    setSelectedCountries(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country])
  }

  const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return iso || '' } }
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return iso || '' } }

  return (
    <div style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>Agente Prospector</h1>
          <p style={{ color: '#888', marginTop: 4, fontSize: '0.9rem' }}>Busca fabricas textiles en Google Maps, enriquece con IA y crea leads en el CRM de BlackWolf</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: `${(statusLabels[agentStatus]?.color || '#555')}22`, color: statusLabels[agentStatus]?.color || '#555' }}>
          {agentStatus === 'running' && <span style={{ animation: 'pulse 1s infinite' }}>●</span>}
          {statusLabels[agentStatus]?.label || agentStatus}
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ background: '#111', border: '1px solid #1F1F1F', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <p style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Pipeline de Prospeccion</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {[
            { icon: '🔍', name: 'Google Maps Search', desc: 'Buscar empresas', color: '#FF6B00', active: true },
            { icon: '🤖', name: 'AI Enrichment', desc: 'Encontrar CEO + datos', color: '#8B5CF6', active: true },
            { icon: '📋', name: 'CRM BlackWolf', desc: 'Insertar leads', color: '#22C55E', active: true },
            { icon: '✍️', name: 'Personalizacion', desc: 'Mensajes de venta', color: '#3B82F6', active: false },
          ].map((step, i, arr) => (
            <div key={step.name} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: step.active ? '#1a1a1a' : '#0A0A0A', border: `2px solid ${step.active ? step.color : '#1F1F1F'}`, borderRadius: 12, padding: '16px 20px', minWidth: 160, textAlign: 'center', opacity: step.active ? 1 : 0.5 }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{step.icon}</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{step.name}</div>
                <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 4 }}>{step.desc}</div>
              </div>
              {i < arr.length - 1 && <div style={{ padding: '0 10px', color: '#555', fontSize: '1.2rem' }}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Main Panel */}
      <div style={{ background: '#111', border: '1px solid #1F1F1F', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #1F1F1F', padding: '0 24px' }}>
          {[{ key: 'config', label: 'Configuracion' }, { key: 'logs', label: 'Logs en vivo' }, { key: 'results', label: 'Resultados' }, { key: 'history', label: 'Historial' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #FF6B00' : '2px solid transparent', color: activeTab === tab.key ? '#fff' : '#666', padding: '12px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s' }}>{tab.label}</button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === 'config' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h3 style={{ color: '#FF6B00', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Busqueda en Google Maps</h3>
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
                <div style={{ background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 8, padding: 16, marginTop: 20 }}>
                  <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 8 }}>Estimacion</div>
                  <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>~{selectedCountries.length * maxPerCountry} leads potenciales</div>
                  <div style={{ color: '#666', fontSize: '0.8rem', marginTop: 4 }}>{selectedCountries.length} paises x {maxPerCountry} por pais</div>
                </div>
              </div>
              <div>
                <h3 style={{ color: '#8B5CF6', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Paises objetivo</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EUROPEAN_COUNTRIES.map(country => {
                    const selected = selectedCountries.includes(country)
                    return <button key={country} onClick={() => toggleCountry(country)} style={{ background: selected ? '#8B5CF622' : '#0D0D0D', border: `1px solid ${selected ? '#8B5CF6' : '#1F1F1F'}`, borderRadius: 8, color: selected ? '#C4B5FD' : '#666', padding: '8px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s' }}>{selected && '✓ '}{country}</button>
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setSelectedCountries([...EUROPEAN_COUNTRIES])} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#888', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem' }}>Seleccionar todos</button>
                  <button onClick={() => setSelectedCountries([])} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#888', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem' }}>Limpiar</button>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button onClick={executeSearch} disabled={agentStatus === 'running'} style={{ flex: 1, background: agentStatus === 'running' ? '#333' : 'linear-gradient(135deg, #FF6B00, #FFB800)', border: 'none', borderRadius: 10, color: agentStatus === 'running' ? '#666' : '#000', fontWeight: 700, padding: '14px 24px', cursor: agentStatus === 'running' ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
                    {agentStatus === 'running' ? '⏳ Ejecutando...' : '🔍 Buscar Leads en Google Maps'}
                  </button>
                  <button onClick={executeEnrich} disabled={agentStatus === 'running'} style={{ background: agentStatus === 'running' ? '#333' : '#8B5CF622', border: `1px solid ${agentStatus === 'running' ? '#333' : '#8B5CF6'}`, borderRadius: 10, color: agentStatus === 'running' ? '#666' : '#C4B5FD', fontWeight: 600, padding: '14px 20px', cursor: agentStatus === 'running' ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                    🤖 Re-enriquecer CEOs
                  </button>
                </div>
                {error && <div style={{ background: '#EF444422', border: '1px solid #EF4444', borderRadius: 8, padding: 12, marginTop: 12, color: '#FCA5A5', fontSize: '0.85rem' }}>{error}</div>}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            logs.length === 0
              ? <div style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: '0.9rem' }}>No hay logs. Ejecuta una busqueda para ver los logs en tiempo real.</div>
              : <div style={{ background: '#0A0A0A', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: 450, overflowY: 'auto' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ padding: '4px 0', display: 'flex', gap: 12 }}>
                      <span style={{ color: '#555', minWidth: 70 }}>{fmtTime(log.time)}</span>
                      <span style={{ color: logTypeColors[log.type] || '#888', fontWeight: 600, minWidth: 60, textTransform: 'uppercase', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}>{log.type}</span>
                      <span style={{ color: '#ccc' }}>{log.msg}</span>
                    </div>
                  ))}
                  {agentStatus === 'running' && <div style={{ color: '#FF6B00', marginTop: 8 }}>▌</div>}
                  <div ref={logsEndRef} />
                </div>
          )}

          {activeTab === 'results' && (
            !results
              ? <div style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: '0.9rem' }}>No hay resultados todavia. Ejecuta una busqueda primero.</div>
              : <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                      { label: 'Total encontrados', value: results.total_found, color: '#FF6B00' },
                      { label: 'Leads creados', value: results.created, color: '#22C55E' },
                      { label: 'Duplicados', value: results.duplicates, color: '#FFB800' },
                      { label: 'Errores', value: results.errors, color: '#EF4444' },
                    ].map(card => (
                      <div key={card.label} style={{ background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                        <div style={{ color: card.color, fontSize: '2rem', fontWeight: 700 }}>{card.value}</div>
                        <div style={{ color: '#666', fontSize: '0.75rem', marginTop: 4 }}>{card.label}</div>
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
                    Los leads han sido insertados en el CRM de BlackWolf (Consola Central → BlackWolf → CRM). Puedes verlos filtrando por fuente "Google Maps".
                  </div>
                </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={loadHistory} disabled={loadingHistory} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#888', padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem' }}>{loadingHistory ? 'Cargando...' : '↻ Actualizar'}</button>
              </div>
              {history.length === 0
                ? <div style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: '0.9rem' }}>{loadingHistory ? 'Cargando historial...' : 'No hay ejecuciones previas.'}</div>
                : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1F1F1F' }}>
                        {['ID', 'Fecha', 'Leads', 'Nuevos', 'Duplicados', 'Estado'].map(h => (
                          <th key={h} style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(run => {
                        const summary = run.results_summary || {}
                        return (
                          <tr key={run.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <td style={{ padding: '10px 12px', color: '#aaa', fontSize: '0.8rem', fontFamily: 'monospace' }}>{run.id?.slice(0, 8)}</td>
                            <td style={{ padding: '10px 12px', color: '#ddd', fontSize: '0.85rem' }}>{fmtDate(run.created_at)}</td>
                            <td style={{ padding: '10px 12px', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{summary.total_found ?? '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#22C55E', fontSize: '0.85rem', fontWeight: 600 }}>{summary.created ?? '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#FFB800', fontSize: '0.85rem' }}>{summary.duplicates ?? '—'}</td>
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

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}
