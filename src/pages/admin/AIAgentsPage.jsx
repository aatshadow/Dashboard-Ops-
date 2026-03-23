import { useState } from 'react'

const agents = [
  {
    id: 'capture',
    name: 'Agente de Captura',
    description: 'Captura leads en base a parámetros y páginas web configuradas',
    icon: '🎯',
    status: 'idle',
    color: '#FF6B00',
    inputs: [
      { label: 'URL objetivo', value: 'https://ejemplo.com/directorio' },
      { label: 'Parámetros', value: 'email, teléfono, nombre, empresa, cargo' },
      { label: 'Filtros', value: 'País: España | Sector: Tech | Tamaño: 10-50' },
    ],
    outputs: [
      { label: 'Leads capturados', value: '347' },
      { label: 'Con email', value: '298' },
      { label: 'Con teléfono', value: '215' },
      { label: 'Tasa de completitud', value: '86%' },
    ],
    logs: [
      { time: '14:32:10', type: 'info', msg: 'Iniciando scraping de página 1/24...' },
      { time: '14:32:45', type: 'success', msg: 'Página 1 completada — 18 leads extraídos' },
      { time: '14:33:02', type: 'info', msg: 'Procesando página 2/24...' },
      { time: '14:33:38', type: 'warning', msg: 'Rate limit detectado, esperando 5s...' },
      { time: '14:33:44', type: 'success', msg: 'Página 2 completada — 14 leads extraídos' },
      { time: '14:34:01', type: 'info', msg: 'Procesando página 3/24...' },
    ],
    runs: [
      { id: 'R-001', date: '2026-03-22 18:45', leads: 142, status: 'completed', duration: '12m 34s' },
      { id: 'R-002', date: '2026-03-21 10:20', leads: 205, status: 'completed', duration: '18m 12s' },
      { id: 'R-003', date: '2026-03-20 09:00', leads: 0, status: 'failed', duration: '0m 45s' },
    ],
  },
  {
    id: 'personalization',
    name: 'Agente de Personalización',
    description: 'Personaliza mensajes para cada lead en base a su perfil y contexto',
    icon: '✍️',
    status: 'running',
    color: '#22C55E',
    inputs: [
      { label: 'Leads de entrada', value: '347 leads del Agente de Captura' },
      { label: 'Plantilla base', value: 'Outreach v3 — Propuesta de valor cybersecurity' },
      { label: 'Tono', value: 'Profesional, directo, personalizado' },
      { label: 'Canal', value: 'Email + LinkedIn' },
    ],
    outputs: [
      { label: 'Mensajes generados', value: '284 / 347' },
      { label: 'Email personalizado', value: '284' },
      { label: 'LinkedIn personalizado', value: '196' },
      { label: 'Tasa de personalización', value: '92%' },
    ],
    logs: [
      { time: '14:40:01', type: 'info', msg: 'Procesando lead #285 — Carlos Ruiz (TechCorp)' },
      { time: '14:40:03', type: 'success', msg: 'Email generado: referencia a su post sobre ciberseguridad' },
      { time: '14:40:04', type: 'success', msg: 'LinkedIn generado: mención de conexión mutua' },
      { time: '14:40:06', type: 'info', msg: 'Procesando lead #286 — María López (DataSec)' },
      { time: '14:40:08', type: 'warning', msg: 'Sin datos de LinkedIn, generando solo email' },
      { time: '14:40:09', type: 'success', msg: 'Email generado: referencia a su empresa y sector' },
    ],
    runs: [
      { id: 'P-001', date: '2026-03-23 14:35', leads: 284, status: 'running', duration: '5m 09s' },
      { id: 'P-002', date: '2026-03-22 19:10', leads: 142, status: 'completed', duration: '8m 22s' },
      { id: 'P-003', date: '2026-03-21 11:00', leads: 205, status: 'completed', duration: '11m 50s' },
    ],
  },
]

const statusLabels = {
  idle: { label: 'Inactivo', color: '#555' },
  running: { label: 'En ejecución', color: '#22C55E' },
  completed: { label: 'Completado', color: '#3B82F6' },
  failed: { label: 'Error', color: '#EF4444' },
}

const logTypeColors = {
  info: '#3B82F6',
  success: '#22C55E',
  warning: '#FFB800',
  error: '#EF4444',
}

export default function AIAgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState('capture')
  const [activeTab, setActiveTab] = useState('overview')

  const agent = agents.find(a => a.id === selectedAgent)

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            AI Agents
          </h1>
          <p style={{ color: '#888', marginTop: 4, fontSize: '0.9rem' }}>
            Monitoriza y gestiona tus agentes de IA
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            background: 'linear-gradient(135deg, #FF6B00, #FFB800)',
            border: 'none', borderRadius: 8, color: '#000', fontWeight: 600,
            padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem'
          }}>
            + Nuevo Agente
          </button>
        </div>
      </div>

      {/* Agent Flow Visualization */}
      <div style={{
        background: '#111', border: '1px solid #1F1F1F', borderRadius: 12,
        padding: 24, marginBottom: 24
      }}>
        <p style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
          Pipeline de Agentes
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {agents.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                onClick={() => setSelectedAgent(a.id)}
                style={{
                  background: selectedAgent === a.id ? '#1a1a1a' : '#0D0D0D',
                  border: `2px solid ${selectedAgent === a.id ? a.color : '#1F1F1F'}`,
                  borderRadius: 12, padding: '16px 24px', cursor: 'pointer',
                  minWidth: 180, textAlign: 'center',
                  transition: 'all 0.2s',
                  boxShadow: selectedAgent === a.id ? `0 0 20px ${a.color}33` : 'none',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{a.icon}</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{a.name}</div>
                <div style={{
                  display: 'inline-block', marginTop: 8, padding: '2px 10px',
                  borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
                  background: `${statusLabels[a.status].color}22`,
                  color: statusLabels[a.status].color,
                }}>
                  {a.status === 'running' && <span style={{ marginRight: 4 }}>●</span>}
                  {statusLabels[a.status].label}
                </div>
              </div>
              {i < agents.length - 1 && (
                <div style={{ padding: '0 12px', color: '#555', fontSize: '1.2rem' }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Agent Detail */}
      <div style={{
        background: '#111', border: '1px solid #1F1F1F', borderRadius: 12, overflow: 'hidden'
      }}>
        {/* Agent Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #1F1F1F',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>{agent.icon}</span>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{agent.name}</h2>
              <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>{agent.description}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              background: agent.status === 'running' ? '#EF444422' : '#22C55E22',
              border: `1px solid ${agent.status === 'running' ? '#EF4444' : '#22C55E'}`,
              borderRadius: 8, color: agent.status === 'running' ? '#EF4444' : '#22C55E',
              fontWeight: 600, padding: '8px 16px', cursor: 'pointer', fontSize: '0.8rem'
            }}>
              {agent.status === 'running' ? '⏹ Detener' : '▶ Ejecutar'}
            </button>
            <button style={{
              background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
              color: '#aaa', padding: '8px 16px', cursor: 'pointer', fontSize: '0.8rem'
            }}>
              ⚙ Configurar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1F1F1F', padding: '0 24px' }}>
          {['overview', 'logs', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #FF6B00' : '2px solid transparent',
                color: activeTab === tab ? '#fff' : '#666',
                padding: '12px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              {tab === 'overview' ? 'Resumen' : tab === 'logs' ? 'Logs en vivo' : 'Historial'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: 24 }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Inputs */}
              <div>
                <h3 style={{ color: '#FF6B00', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Inputs / Configuración
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {agent.inputs.map((inp, i) => (
                    <div key={i} style={{
                      background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 8, padding: 12
                    }}>
                      <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>
                        {inp.label}
                      </div>
                      <div style={{ color: '#ddd', fontSize: '0.85rem' }}>{inp.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Outputs */}
              <div>
                <h3 style={{ color: '#22C55E', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  Outputs / Resultados
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {agent.outputs.map((out, i) => (
                    <div key={i} style={{
                      background: '#0D0D0D', border: '1px solid #1F1F1F', borderRadius: 8, padding: 12, textAlign: 'center'
                    }}>
                      <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{out.value}</div>
                      <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 4 }}>{out.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={{
              background: '#0A0A0A', borderRadius: 8, padding: 16,
              fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: 350, overflowY: 'auto'
            }}>
              {agent.logs.map((log, i) => (
                <div key={i} style={{ padding: '4px 0', display: 'flex', gap: 12 }}>
                  <span style={{ color: '#555' }}>{log.time}</span>
                  <span style={{
                    color: logTypeColors[log.type], fontWeight: 600, minWidth: 60, textTransform: 'uppercase', fontSize: '0.7rem',
                    display: 'flex', alignItems: 'center'
                  }}>
                    {log.type}
                  </span>
                  <span style={{ color: '#ccc' }}>{log.msg}</span>
                </div>
              ))}
              <div style={{ color: '#555', marginTop: 8, animation: 'blink 1s infinite' }}>▌</div>
            </div>
          )}

          {activeTab === 'history' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1F1F1F' }}>
                  {['ID', 'Fecha', 'Leads', 'Estado', 'Duración'].map(h => (
                    <th key={h} style={{
                      color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', padding: '8px 12px',
                      textAlign: 'left', fontWeight: 600
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agent.runs.map(run => (
                  <tr key={run.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '10px 12px', color: '#aaa', fontSize: '0.85rem', fontFamily: 'monospace' }}>{run.id}</td>
                    <td style={{ padding: '10px 12px', color: '#ddd', fontSize: '0.85rem' }}>{run.date}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{run.leads}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
                        background: `${statusLabels[run.status]?.color || '#555'}22`,
                        color: statusLabels[run.status]?.color || '#555',
                      }}>
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#888', fontSize: '0.85rem' }}>{run.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
