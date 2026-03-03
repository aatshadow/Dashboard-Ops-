import { useState, useRef, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

const QUICK_QUESTIONS = [
  'Resumen general del mes',
  'Mejor closer este mes',
  'Rendimiento de setters',
  'Proyecciones vs actual',
  'Comisiones estimadas',
  'Ventas por producto',
]

const GREETING = `Hola, soy el agente de analítica de FBA Academy. Tengo acceso a **todos** los datos del dashboard:

- Ventas (actual + mes anterior + histórico)
- Reportes de setters y closers
- Proyecciones y targets
- Comisiones estimadas
- Métodos de pago y fees

Pregúntame lo que necesites.`

export default function AgentChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: GREETING }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  async function sendQuestion(question) {
    if (!question.trim() || loading) return

    const userMsg = { role: 'user', content: question.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, { role: 'assistant', content: 'Analizando datos...', streaming: true }])

    try {
      const history = messages
        .filter(m => !m.streaming)
        .slice(1)
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), history }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error del servidor' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: data.answer || 'Sin respuesta.' }
        return updated
      })
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${err.message}` }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendQuestion(input)
  }

  function handleClearChat() {
    setMessages([{ role: 'assistant', content: GREETING }])
  }

  // Only show quick questions when there's just the greeting
  const showQuickQuestions = messages.length === 1

  return (
    <>
      <button
        className="agent-fab"
        onClick={() => setOpen(!open)}
        title="Agente IA"
      >
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="agent-panel">
          <div className="agent-header">
            <div className="agent-header-info">
              <span className="agent-header-icon">🤖</span>
              <div>
                <div className="agent-header-title">Agente IA</div>
                <div className="agent-header-sub">Todos los datos del dashboard</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {messages.length > 1 && (
                <button
                  className="agent-close"
                  onClick={handleClearChat}
                  title="Nueva conversación"
                  style={{ fontSize: '0.75rem' }}
                >
                  🗑
                </button>
              )}
              <button className="agent-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          <div className="agent-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`agent-msg agent-msg--${msg.role}`}>
                {msg.role === 'assistant' && <span className="agent-msg-avatar">🤖</span>}
                <div className={`agent-msg-bubble agent-msg-bubble--${msg.role}`}>
                  {msg.content || (msg.streaming ? '...' : '')}
                </div>
              </div>
            ))}

            {showQuickQuestions && !loading && (
              <div className="agent-quick-questions">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    className="agent-quick-btn"
                    onClick={() => sendQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {loading && messages[messages.length - 1]?.content === '' && (
              <div className="agent-typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="agent-input-bar" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="agent-input"
              placeholder="Pregunta lo que quieras..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="agent-send" disabled={loading || !input.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}
