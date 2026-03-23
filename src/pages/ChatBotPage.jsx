import { useState, useMemo, useRef, useEffect } from 'react'
import { useClientData } from '../hooks/useClientData'
import { useAsync } from '../hooks/useAsync'
import { MessageCircle, Zap, Users, Radio, Plus, Trash2, Edit3, Send, Search, ChevronRight, Bot, Instagram, MessageSquare, Phone, ArrowLeft, X, ToggleLeft, ToggleRight, Hash, Copy } from 'lucide-react'

const TABS = [
  { id: 'flows', label: 'Flujos', icon: Zap },
  { id: 'conversations', label: 'Live Chat', icon: MessageCircle },
  { id: 'contacts', label: 'Contactos', icon: Users },
  { id: 'broadcasts', label: 'Broadcasts', icon: Radio },
]

const CHANNELS = { instagram: { icon: Instagram, label: 'Instagram', color: '#E4405F' }, whatsapp: { icon: Phone, label: 'WhatsApp', color: '#25D366' }, messenger: { icon: MessageSquare, label: 'Messenger', color: '#0084FF' } }
const TRIGGER_TYPES = [
  { value: 'keyword', label: 'Palabra clave' },
  { value: 'comment', label: 'Comentario en post' },
  { value: 'story_reply', label: 'Respuesta a story' },
  { value: 'story_mention', label: 'Mencion en story' },
  { value: 'welcome', label: 'Mensaje de bienvenida' },
  { value: 'button', label: 'Click en boton' },
]
const NODE_TYPES = [
  { value: 'message', label: 'Enviar mensaje', icon: '💬' },
  { value: 'image', label: 'Enviar imagen', icon: '🖼️' },
  { value: 'buttons', label: 'Botones', icon: '🔘' },
  { value: 'quick_reply', label: 'Respuesta rapida', icon: '⚡' },
  { value: 'delay', label: 'Esperar', icon: '⏱️' },
  { value: 'condition', label: 'Condicion', icon: '🔀' },
  { value: 'tag', label: 'Anadir tag', icon: '🏷️' },
  { value: 'notify', label: 'Notificar equipo', icon: '🔔' },
  { value: 'collect_email', label: 'Pedir email', icon: '📧' },
  { value: 'collect_phone', label: 'Pedir telefono', icon: '📱' },
]

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, flex: 1, minWidth: 170 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} style={{ color: color || 'var(--orange)' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

// ---- FLOW BUILDER ----
function FlowBuilder({ flow, onSave, onCancel }) {
  const [form, setForm] = useState(flow || { name: '', description: '', triggerType: 'keyword', triggerValue: '', channel: 'instagram', active: true, nodes: [] })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const addNode = (type) => {
    const defaults = {
      message: { type: 'message', content: '' },
      image: { type: 'image', url: '', caption: '' },
      buttons: { type: 'buttons', text: '', buttons: [{ label: 'Opcion 1', value: 'opt1' }] },
      quick_reply: { type: 'quick_reply', text: '', options: ['Si', 'No'] },
      delay: { type: 'delay', seconds: 3 },
      condition: { type: 'condition', field: 'tag', operator: 'equals', value: '' },
      tag: { type: 'tag', tag: '' },
      notify: { type: 'notify', message: '' },
      collect_email: { type: 'collect_email', prompt: 'Cual es tu email?' },
      collect_phone: { type: 'collect_phone', prompt: 'Cual es tu telefono?' },
    }
    set('nodes', [...form.nodes, { id: Date.now().toString(), ...defaults[type] }])
  }

  const updateNode = (idx, updates) => {
    const nodes = [...form.nodes]
    nodes[idx] = { ...nodes[idx], ...updates }
    set('nodes', nodes)
  }

  const removeNode = (idx) => {
    set('nodes', form.nodes.filter((_, i) => i !== idx))
  }

  const moveNode = (idx, dir) => {
    const nodes = [...form.nodes]
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= nodes.length) return
    ;[nodes[idx], nodes[newIdx]] = [nodes[newIdx], nodes[idx]]
    set('nodes', nodes)
  }

  const ChannelIcon = CHANNELS[form.channel]?.icon || MessageCircle

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre del flujo</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Bienvenida Instagram" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Canal</label>
            <select value={form.channel} onChange={e => set('channel', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
              {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Tipo de trigger</label>
            <select value={form.triggerType} onChange={e => set('triggerType', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
              {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {form.triggerType === 'keyword' ? 'Palabras clave (separar con comas)' : form.triggerType === 'comment' ? 'Palabras clave en comentarios' : 'Valor del trigger'}
            </label>
            <input value={form.triggerValue} onChange={e => set('triggerValue', e.target.value)} placeholder="info, precio, hola" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
          </div>
        </div>
      </div>

      {/* Flow Nodes */}
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <h4 style={{ color: 'var(--text)', margin: 0 }}>Pasos del flujo</h4>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({form.nodes.length} pasos)</span>
        </div>

        {/* Trigger indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(255,107,0,0.08)', borderRadius: 10, marginBottom: 8, border: '1px solid rgba(255,107,0,0.2)' }}>
          <Zap size={18} style={{ color: 'var(--orange)' }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--orange)', fontSize: 13 }}>Trigger: {TRIGGER_TYPES.find(t => t.value === form.triggerType)?.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{form.triggerValue || '(sin configurar)'}</div>
          </div>
        </div>

        {/* Connector */}
        {form.nodes.length > 0 && <div style={{ width: 2, height: 16, background: 'var(--border)', margin: '0 auto' }} />}

        {/* Nodes */}
        {form.nodes.map((node, idx) => {
          const nodeType = NODE_TYPES.find(n => n.value === node.type)
          return (
            <div key={node.id}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{nodeType?.icon || '📦'}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{nodeType?.label || node.type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>#{idx + 1}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {idx > 0 && <button onClick={() => moveNode(idx, -1)} style={{ padding: '4px 6px', borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11 }}>↑</button>}
                    {idx < form.nodes.length - 1 && <button onClick={() => moveNode(idx, 1)} style={{ padding: '4px 6px', borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11 }}>↓</button>}
                    <button onClick={() => removeNode(idx)} style={{ padding: '4px 6px', borderRadius: 4, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444', fontSize: 11 }}><Trash2 size={11} /></button>
                  </div>
                </div>

                {/* Node content editor */}
                {(node.type === 'message' || node.type === 'notify') && (
                  <textarea value={node.content || node.message || ''} onChange={e => updateNode(idx, node.type === 'notify' ? { message: e.target.value } : { content: e.target.value })} placeholder="Escribe tu mensaje..." rows={3} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, resize: 'vertical' }} />
                )}
                {node.type === 'image' && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input value={node.url || ''} onChange={e => updateNode(idx, { url: e.target.value })} placeholder="URL de la imagen" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
                    <input value={node.caption || ''} onChange={e => updateNode(idx, { caption: e.target.value })} placeholder="Caption (opcional)" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
                  </div>
                )}
                {node.type === 'buttons' && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <textarea value={node.text || ''} onChange={e => updateNode(idx, { text: e.target.value })} placeholder="Texto del mensaje con botones" rows={2} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, resize: 'vertical' }} />
                    {(node.buttons || []).map((btn, bi) => (
                      <div key={bi} style={{ display: 'flex', gap: 8 }}>
                        <input value={btn.label} onChange={e => { const btns = [...(node.buttons || [])]; btns[bi] = { ...btns[bi], label: e.target.value }; updateNode(idx, { buttons: btns }) }} placeholder="Texto del boton" style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12 }} />
                        <button onClick={() => { const btns = (node.buttons || []).filter((_, i) => i !== bi); updateNode(idx, { buttons: btns }) }} style={{ padding: '6px 8px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444' }}><X size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => updateNode(idx, { buttons: [...(node.buttons || []), { label: '', value: '' }] })} style={{ padding: '6px 12px', borderRadius: 6, border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>+ Anadir boton</button>
                  </div>
                )}
                {node.type === 'quick_reply' && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <textarea value={node.text || ''} onChange={e => updateNode(idx, { text: e.target.value })} placeholder="Texto de la pregunta" rows={2} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, resize: 'vertical' }} />
                    <input value={(node.options || []).join(', ')} onChange={e => updateNode(idx, { options: e.target.value.split(',').map(o => o.trim()) })} placeholder="Opciones separadas por comas" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
                  </div>
                )}
                {node.type === 'delay' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Esperar</span>
                    <input type="number" value={node.seconds || 3} onChange={e => updateNode(idx, { seconds: parseInt(e.target.value) || 0 })} min={1} style={{ width: 80, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, textAlign: 'center' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>segundos</span>
                  </div>
                )}
                {node.type === 'tag' && (
                  <input value={node.tag || ''} onChange={e => updateNode(idx, { tag: e.target.value })} placeholder="Nombre del tag" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
                )}
                {(node.type === 'collect_email' || node.type === 'collect_phone') && (
                  <input value={node.prompt || ''} onChange={e => updateNode(idx, { prompt: e.target.value })} placeholder="Mensaje para pedir el dato" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
                )}
                {node.type === 'condition' && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={node.field || 'tag'} onChange={e => updateNode(idx, { field: e.target.value })} style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12 }}>
                      <option value="tag">Tag</option>
                      <option value="email">Email</option>
                      <option value="phone">Telefono</option>
                      <option value="name">Nombre</option>
                    </select>
                    <select value={node.operator || 'equals'} onChange={e => updateNode(idx, { operator: e.target.value })} style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12 }}>
                      <option value="equals">es igual a</option>
                      <option value="contains">contiene</option>
                      <option value="exists">existe</option>
                      <option value="not_exists">no existe</option>
                    </select>
                    <input value={node.value || ''} onChange={e => updateNode(idx, { value: e.target.value })} placeholder="Valor" style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12 }} />
                  </div>
                )}
              </div>
              {idx < form.nodes.length - 1 && <div style={{ width: 2, height: 16, background: 'var(--border)', margin: '0 auto' }} />}
            </div>
          )
        })}

        {/* Add node buttons */}
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {NODE_TYPES.map(nt => (
            <button key={nt.value} onClick={() => addNode(nt.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, transition: 'all .2s' }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.color = 'var(--orange)' }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}>
              <span>{nt.icon}</span> {nt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
        <button onClick={() => onSave(form)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Guardar flujo</button>
      </div>
    </div>
  )
}

// ---- LIVE CHAT ----
function LiveChat({ conversations, contacts, messages: allMessages, onSendMessage, getChatMessages }) {
  const [selectedConvId, setSelectedConvId] = useState(null)
  const [msgInput, setMsgInput] = useState('')
  const [convMessages, setConvMessages] = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const msgsEndRef = useRef(null)
  const [searchConv, setSearchConv] = useState('')

  const selectedConv = conversations.find(c => c.id === selectedConvId)
  const selectedContact = selectedConv ? contacts.find(c => c.id === selectedConv.contactId) : null

  useEffect(() => {
    if (!selectedConvId) return
    setLoadingMsgs(true)
    getChatMessages(selectedConvId).then(msgs => {
      setConvMessages(msgs)
      setLoadingMsgs(false)
    })
  }, [selectedConvId])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages])

  const handleSend = async () => {
    if (!msgInput.trim() || !selectedConvId) return
    await onSendMessage({ conversationId: selectedConvId, senderType: 'agent', content: msgInput, messageType: 'text' })
    setConvMessages(prev => [...prev, { id: Date.now().toString(), senderType: 'agent', content: msgInput, messageType: 'text', created_at: new Date().toISOString() }])
    setMsgInput('')
  }

  const filteredConvs = searchConv
    ? conversations.filter(c => {
        const contact = contacts.find(ct => ct.id === c.contactId)
        return (contact?.name || contact?.username || c.lastMessage || '').toLowerCase().includes(searchConv.toLowerCase())
      })
    : conversations

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 260px)', minHeight: 500, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Conversation list */}
      <div style={{ width: 320, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input value={searchConv} onChange={e => setSearchConv(e.target.value)} placeholder="Buscar conversacion..." style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConvs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 13 }}>Sin conversaciones</div>
          ) : filteredConvs.map(conv => {
            const contact = contacts.find(c => c.id === conv.contactId)
            const isSelected = conv.id === selectedConvId
            const ChIcon = CHANNELS[conv.channel]?.icon || MessageCircle
            return (
              <div key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: isSelected ? 'rgba(255,107,0,0.08)' : 'transparent', borderLeft: isSelected ? '3px solid var(--orange)' : '3px solid transparent', transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {contact?.avatarUrl ? <img src={contact.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>{(contact?.name || '?')[0].toUpperCase()}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact?.name || contact?.username || 'Desconocido'}</span>
                      <ChIcon size={12} style={{ color: CHANNELS[conv.channel]?.color, flexShrink: 0 }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{conv.lastMessage || '...'}</div>
                  </div>
                  {(conv.unreadCount || 0) > 0 && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{conv.unreadCount}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!selectedConvId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexDirection: 'column', gap: 12 }}>
            <MessageCircle size={48} style={{ opacity: 0.2 }} />
            <p>Selecciona una conversacion</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{(selectedContact?.name || '?')[0].toUpperCase()}</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{selectedContact?.name || selectedContact?.username || 'Desconocido'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{selectedContact?.username ? '@' + selectedContact.username : selectedContact?.email || ''} · {selectedConv?.channel}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>Cargando...</div>
              ) : convMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>Sin mensajes aun</div>
              ) : convMessages.map(msg => {
                const isAgent = msg.senderType === 'agent' || msg.senderType === 'bot'
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isAgent ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isAgent ? 'var(--orange)' : 'rgba(255,255,255,0.08)', color: isAgent ? '#fff' : 'var(--text)', fontSize: 14, lineHeight: 1.5 }}>
                      {msg.content}
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={msgsEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Escribe un mensaje..." style={{ flex: 1, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
              <button onClick={handleSend} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Send size={14} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ChatBotPage() {
  const { getChatFlows, addChatFlow, updateChatFlow, deleteChatFlow, getChatContacts, addChatContact, deleteChatContact, getChatConversations, getChatMessages, addChatMessage, getChatBroadcasts, addChatBroadcast, updateChatBroadcast, deleteChatBroadcast } = useClientData()

  const [flows, flowsLoading, refreshFlows] = useAsync(getChatFlows, [])
  const [contacts, contactsLoading, refreshContacts] = useAsync(getChatContacts, [])
  const [conversations, convsLoading, refreshConvs] = useAsync(getChatConversations, [])
  const [broadcasts, broadcastsLoading, refreshBroadcasts] = useAsync(getChatBroadcasts, [])

  const [tab, setTab] = useState('flows')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', username: '', email: '', phone: '', platform: 'instagram' })

  // Broadcast form
  const [showBroadcastForm, setShowBroadcastForm] = useState(false)
  const [broadcastForm, setBroadcastForm] = useState({ name: '', channel: 'instagram', messageContent: '', messageType: 'text', status: 'draft' })

  const loading = flowsLoading || contactsLoading || convsLoading || broadcastsLoading

  const activeFlows = flows.filter(f => f.active).length
  const totalContacts = contacts.length
  const totalConvs = conversations.length
  const totalBroadcasts = broadcasts.length

  // Handlers
  const handleSaveFlow = async (form) => {
    if (editItem) {
      await updateChatFlow(editItem.id, form)
    } else {
      await addChatFlow(form)
    }
    refreshFlows()
    setShowForm(false)
    setEditItem(null)
  }

  const handleSaveContact = async (e) => {
    e.preventDefault()
    await addChatContact(contactForm)
    refreshContacts()
    setShowContactForm(false)
    setContactForm({ name: '', username: '', email: '', phone: '', platform: 'instagram' })
  }

  const handleSaveBroadcast = async (e) => {
    e.preventDefault()
    await addChatBroadcast(broadcastForm)
    refreshBroadcasts()
    setShowBroadcastForm(false)
    setBroadcastForm({ name: '', channel: 'instagram', messageContent: '', messageType: 'text', status: 'draft' })
  }

  const filteredContacts = useMemo(() => {
    if (!search) return contacts
    return contacts.filter(c => (c.name + ' ' + c.username + ' ' + c.email).toLowerCase().includes(search.toLowerCase()))
  }, [contacts, search])

  if (loading) return <div className="dashboard"><div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Cargando...</div></div>

  return (
    <div className="dashboard">
      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon={Zap} label="Flujos activos" value={activeFlows} color="#22c55e" />
        <StatCard icon={Users} label="Contactos" value={totalContacts} />
        <StatCard icon={MessageCircle} label="Conversaciones" value={totalConvs} />
        <StatCard icon={Radio} label="Broadcasts" value={totalBroadcasts} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); setEditItem(null) }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.id ? 'var(--orange)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-secondary)', transition: 'all .2s' }}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* FLOWS TAB */}
      {tab === 'flows' && !showForm && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 18 }}>Flujos de Automatizacion</h3>
            <button onClick={() => { setShowForm(true); setEditItem(null) }} className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Nuevo Flujo</button>
          </div>
          {flows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Bot size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: '0 0 8px' }}>No hay flujos creados</p>
              <p style={{ fontSize: 13 }}>Crea tu primer flujo de automatizacion para responder mensajes automaticamente.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {flows.map(f => {
                const ChIcon = CHANNELS[f.channel]?.icon || MessageCircle
                const trigger = TRIGGER_TYPES.find(t => t.value === f.triggerType)
                return (
                  <div key={f.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: f.active ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={18} style={{ color: f.active ? '#22c55e' : '#666' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{f.name}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ChIcon size={12} style={{ color: CHANNELS[f.channel]?.color }} /> {CHANNELS[f.channel]?.label}</span>
                        <span>Trigger: {trigger?.label || f.triggerType}</span>
                        {f.triggerValue && <span style={{ fontStyle: 'italic' }}>"{f.triggerValue}"</span>}
                        <span>{(f.nodes || []).length} pasos</span>
                      </div>
                    </div>
                    <button onClick={async () => { await updateChatFlow(f.id, { active: !f.active }); refreshFlows() }}
                      style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: f.active ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', color: f.active ? '#22c55e' : '#666', fontSize: 12, fontWeight: 600 }}>
                      {f.active ? 'Activo' : 'Inactivo'}
                    </button>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setEditItem(f); setShowForm(true) }} style={{ padding: 8, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-secondary)' }}><Edit3 size={14} /></button>
                      <button onClick={async () => { await deleteChatFlow(f.id); refreshFlows() }} style={{ padding: 8, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {tab === 'flows' && showForm && (
        <>
          <button onClick={() => { setShowForm(false); setEditItem(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', border: 'none', background: 'none', color: 'var(--orange)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 12 }}><ArrowLeft size={14} /> Volver</button>
          <FlowBuilder flow={editItem} onSave={handleSaveFlow} onCancel={() => { setShowForm(false); setEditItem(null) }} />
        </>
      )}

      {/* LIVE CHAT TAB */}
      {tab === 'conversations' && (
        <LiveChat conversations={conversations} contacts={contacts} getChatMessages={getChatMessages} onSendMessage={addChatMessage} />
      )}

      {/* CONTACTS TAB */}
      {tab === 'contacts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 18 }}>Contactos del Chat</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ padding: '8px 12px 8px 30px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
              </div>
              <button onClick={() => setShowContactForm(true)} className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Anadir</button>
            </div>
          </div>
          {showContactForm && (
            <form onSubmit={handleSaveContact} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre</label>
                  <input value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} required style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Username</label>
                  <input value={contactForm.username} onChange={e => setContactForm({ ...contactForm, username: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Plataforma</label>
                  <select value={contactForm.platform} onChange={e => setContactForm({ ...contactForm, platform: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                    {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
                  <input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Telefono</label>
                  <input value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setShowContactForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button type="submit" className="btn-action">Guardar</button>
              </div>
            </form>
          )}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contacto</th>
                  <th>Username</th>
                  <th>Plataforma</th>
                  <th>Email</th>
                  <th>Telefono</th>
                  <th>Ultima interaccion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Sin contactos</td></tr>
                ) : filteredContacts.map(c => {
                  const ChIcon = CHANNELS[c.platform]?.icon || MessageCircle
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>{(c.name || '?')[0].toUpperCase()}</span>
                          </div>
                          <span className="cell-bold">{c.name || '—'}</span>
                        </div>
                      </td>
                      <td>{c.username ? '@' + c.username : '—'}</td>
                      <td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ChIcon size={12} style={{ color: CHANNELS[c.platform]?.color }} /> {CHANNELS[c.platform]?.label}</span></td>
                      <td>{c.email || '—'}</td>
                      <td>{c.phone || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.lastInteraction ? new Date(c.lastInteraction).toLocaleDateString() : '—'}</td>
                      <td>
                        <button onClick={async () => { await deleteChatContact(c.id); refreshContacts() }} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* BROADCASTS TAB */}
      {tab === 'broadcasts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 18 }}>Broadcasts</h3>
            <button onClick={() => setShowBroadcastForm(true)} className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Nuevo Broadcast</button>
          </div>
          {showBroadcastForm && (
            <form onSubmit={handleSaveBroadcast} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre</label>
                  <input value={broadcastForm.name} onChange={e => setBroadcastForm({ ...broadcastForm, name: e.target.value })} required style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Canal</label>
                  <select value={broadcastForm.channel} onChange={e => setBroadcastForm({ ...broadcastForm, channel: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                    {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Tipo</label>
                  <select value={broadcastForm.messageType} onChange={e => setBroadcastForm({ ...broadcastForm, messageType: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                    <option value="text">Texto</option>
                    <option value="image">Imagen</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Mensaje</label>
                  <textarea value={broadcastForm.messageContent} onChange={e => setBroadcastForm({ ...broadcastForm, messageContent: e.target.value })} rows={4} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setShowBroadcastForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button type="submit" className="btn-action">Crear Broadcast</button>
              </div>
            </form>
          )}
          {broadcasts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Radio size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No hay broadcasts. Envia mensajes masivos a tus contactos.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {broadcasts.map(b => {
                const ChIcon = CHANNELS[b.channel]?.icon || MessageCircle
                return (
                  <div key={b.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,107,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChIcon size={18} style={{ color: CHANNELS[b.channel]?.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>{b.messageContent || '(Sin mensaje)'}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: b.status === 'sent' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', color: b.status === 'sent' ? '#22c55e' : '#999' }}>{b.status}</span>
                    <div style={{ textAlign: 'center', minWidth: 50 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{b.totalSent || 0}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Enviados</div>
                    </div>
                    <button onClick={async () => { await deleteChatBroadcast(b.id); refreshBroadcasts() }} style={{ padding: 8, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
