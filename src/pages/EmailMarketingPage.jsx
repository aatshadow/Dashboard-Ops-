import { useState, useMemo } from 'react'
import { useClientData } from '../hooks/useClientData'
import { useAsync } from '../hooks/useAsync'
import { Mail, Users, FileText, Send, Plus, Trash2, Edit3, Eye, ChevronRight, BarChart3, Search, Tag, X, Copy, ArrowLeft } from 'lucide-react'

const TABS = [
  { id: 'campaigns', label: 'Campanas', icon: Send },
  { id: 'lists', label: 'Listas', icon: Users },
  { id: 'templates', label: 'Plantillas', icon: FileText },
  { id: 'subscribers', label: 'Suscriptores', icon: Mail },
]

const STATUS_COLORS = {
  draft: { bg: 'rgba(255,255,255,0.08)', color: '#999' },
  scheduled: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  sending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  sent: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  subscribed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  unsubscribed: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  bounced: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
}

function Badge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft
  return <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{status}</span>
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} style={{ color: 'var(--orange)' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ---- EMAIL EDITOR ----
function EmailEditor({ html, onChange }) {
  const [mode, setMode] = useState('visual')
  const [showBlocks, setShowBlocks] = useState(false)

  const insertBlock = (type) => {
    const blocks = {
      heading: '<h1 style="color:#333;font-family:Arial,sans-serif;margin:0 0 16px">Tu titulo aqui</h1>',
      text: '<p style="color:#555;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px">Tu texto aqui...</p>',
      button: '<table cellpadding="0" cellspacing="0" style="margin:20px 0"><tr><td style="background:var(--orange,#FF6B00);border-radius:8px;padding:14px 32px"><a href="#" style="color:#fff;text-decoration:none;font-weight:bold;font-size:16px">Click Aqui</a></td></tr></table>',
      image: '<img src="https://via.placeholder.com/600x300" alt="Image" style="max-width:100%;height:auto;border-radius:8px;margin:16px 0" />',
      divider: '<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />',
      spacer: '<div style="height:32px"></div>',
      columns: '<table width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" style="padding-right:12px;vertical-align:top"><p style="color:#555;font-family:Arial,sans-serif">Columna 1</p></td><td width="50%" style="padding-left:12px;vertical-align:top"><p style="color:#555;font-family:Arial,sans-serif">Columna 2</p></td></tr></table>',
      social: '<table cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="padding:0 8px"><a href="#" style="color:#555;text-decoration:none">Instagram</a></td><td style="padding:0 8px"><a href="#" style="color:#555;text-decoration:none">Twitter</a></td><td style="padding:0 8px"><a href="#" style="color:#555;text-decoration:none">LinkedIn</a></td></tr></table>',
      footer: '<p style="color:#999;font-family:Arial,sans-serif;font-size:12px;text-align:center;margin:32px 0 0">Has recibido este email porque estas suscrito. <a href="#" style="color:#999">Cancelar suscripcion</a></p>',
    }
    onChange(html + '\n' + (blocks[type] || ''))
    setShowBlocks(false)
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setMode('visual')} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: mode === 'visual' ? 'var(--orange)' : 'transparent', color: mode === 'visual' ? '#fff' : 'var(--text-secondary)' }}>Visual</button>
        <button onClick={() => setMode('html')} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: mode === 'html' ? 'var(--orange)' : 'transparent', color: mode === 'html' ? '#fff' : 'var(--text-secondary)' }}>HTML</button>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowBlocks(!showBlocks)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, background: 'transparent', color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> Bloque
          </button>
          {showBlocks && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, zIndex: 100, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              {['heading', 'text', 'button', 'image', 'divider', 'spacer', 'columns', 'social', 'footer'].map(b => (
                <button key={b} onClick={() => insertBlock(b)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13, borderRadius: 4 }}
                  onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}>
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {mode === 'html' ? (
        <textarea value={html} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', minHeight: 400, padding: 16, background: 'var(--bg)', color: 'var(--text)', border: 'none', fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }} />
      ) : (
        <div style={{ minHeight: 400, padding: 24, background: '#fff', color: '#333' }}>
          <div dangerouslySetInnerHTML={{ __html: html || '<p style="color:#ccc;text-align:center;padding:60px">Haz click en "+ Bloque" para empezar a disenar tu email</p>' }} />
        </div>
      )}
    </div>
  )
}

// ---- CAMPAIGN FORM ----
function CampaignForm({ campaign, lists, templates, onSave, onCancel }) {
  const [form, setForm] = useState(campaign || { name: '', subject: '', fromName: '', fromEmail: '', replyTo: '', listId: '', templateId: '', htmlContent: '', status: 'draft' })
  const [activeSection, setActiveSection] = useState('details')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const selectedTemplate = templates.find(t => t.id === form.templateId)

  const applyTemplate = (tplId) => {
    const tpl = templates.find(t => t.id === tplId)
    if (tpl) {
      set('templateId', tplId)
      set('subject', tpl.subject || form.subject)
      set('htmlContent', tpl.htmlContent || '')
    }
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {['details', 'content', 'preview'].map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            style={{ flex: 1, padding: '14px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeSection === s ? 'rgba(255,107,0,0.1)' : 'transparent', color: activeSection === s ? 'var(--orange)' : 'var(--text-secondary)', borderBottom: activeSection === s ? '2px solid var(--orange)' : '2px solid transparent' }}>
            {s === 'details' ? 'Detalles' : s === 'content' ? 'Contenido' : 'Preview'}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {activeSection === 'details' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre de campana</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Newsletter Marzo 2026" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Asunto</label>
              <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Asunto del email..." style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre remitente</label>
              <input value={form.fromName} onChange={e => set('fromName', e.target.value)} placeholder="Tu nombre o empresa" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email remitente</label>
              <input value={form.fromEmail} onChange={e => set('fromEmail', e.target.value)} placeholder="noreply@tuempresa.com" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Lista de destinatarios</label>
              <select value={form.listId} onChange={e => set('listId', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                <option value="">Seleccionar lista...</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Plantilla</label>
              <select value={form.templateId} onChange={e => applyTemplate(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                <option value="">Sin plantilla</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {activeSection === 'content' && (
          <EmailEditor html={form.htmlContent} onChange={v => set('htmlContent', v)} />
        )}

        {activeSection === 'preview' && (
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 24, maxWidth: 640, margin: '0 auto' }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>De: {form.fromName || '—'} &lt;{form.fromEmail || '—'}&gt;</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 12 }}>{form.subject || '(Sin asunto)'}</div>
              <div dangerouslySetInnerHTML={{ __html: form.htmlContent || '<p style="color:#ccc;text-align:center">Sin contenido</p>' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
          <button onClick={() => onSave(form)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Guardar campana</button>
        </div>
      </div>
    </div>
  )
}

// ---- TEMPLATE FORM ----
function TemplateForm({ template, onSave, onCancel }) {
  const [form, setForm] = useState(template || { name: '', subject: '', htmlContent: '', category: 'general' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre plantilla</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Asunto por defecto</label>
          <input value={form.subject} onChange={e => set('subject', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Categoria</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
            <option value="general">General</option>
            <option value="newsletter">Newsletter</option>
            <option value="promotional">Promocional</option>
            <option value="transactional">Transaccional</option>
            <option value="onboarding">Onboarding</option>
          </select>
        </div>
      </div>
      <EmailEditor html={form.htmlContent} onChange={v => set('htmlContent', v)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
        <button onClick={() => onSave(form)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Guardar plantilla</button>
      </div>
    </div>
  )
}

export default function EmailMarketingPage() {
  const { getEmailLists, addEmailList, updateEmailList, deleteEmailList, getEmailSubscribers, addEmailSubscriber, deleteEmailSubscriber, getEmailTemplates, addEmailTemplate, updateEmailTemplate, deleteEmailTemplate, getEmailCampaigns, addEmailCampaign, updateEmailCampaign, deleteEmailCampaign } = useClientData()

  const [lists, listsLoading, refreshLists] = useAsync(getEmailLists, [])
  const [subscribers, subsLoading, refreshSubs] = useAsync(getEmailSubscribers, [])
  const [templates, tplLoading, refreshTpls] = useAsync(getEmailTemplates, [])
  const [campaigns, campLoading, refreshCamps] = useAsync(getEmailCampaigns, [])

  const [tab, setTab] = useState('campaigns')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  // List form
  const [listForm, setListForm] = useState({ name: '', description: '' })
  const [showListForm, setShowListForm] = useState(false)

  // Subscriber form
  const [subForm, setSubForm] = useState({ email: '', name: '', listId: '', status: 'subscribed' })
  const [showSubForm, setShowSubForm] = useState(false)
  const [selectedListId, setSelectedListId] = useState('')

  const loading = listsLoading || subsLoading || tplLoading || campLoading

  // Stats
  const totalSubs = subscribers.filter(s => s.status === 'subscribed').length
  const totalCampaigns = campaigns.length
  const totalSent = campaigns.reduce((s, c) => s + (c.totalSent || 0), 0)
  const totalOpened = campaigns.reduce((s, c) => s + (c.totalOpened || 0), 0)
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0'

  const filteredSubs = useMemo(() => {
    let list = subscribers
    if (selectedListId) list = list.filter(s => s.listId === selectedListId)
    if (search) list = list.filter(s => (s.email + ' ' + s.name).toLowerCase().includes(search.toLowerCase()))
    return list
  }, [subscribers, selectedListId, search])

  // Handlers
  const handleSaveCampaign = async (form) => {
    if (editItem) {
      await updateEmailCampaign(editItem.id, form)
    } else {
      await addEmailCampaign(form)
    }
    refreshCamps()
    setShowForm(false)
    setEditItem(null)
  }

  const handleSaveTemplate = async (form) => {
    if (editItem) {
      await updateEmailTemplate(editItem.id, form)
    } else {
      await addEmailTemplate(form)
    }
    refreshTpls()
    setShowForm(false)
    setEditItem(null)
  }

  const handleSaveList = async (e) => {
    e.preventDefault()
    if (editItem) {
      await updateEmailList(editItem.id, listForm)
    } else {
      await addEmailList(listForm)
    }
    refreshLists()
    setShowListForm(false)
    setEditItem(null)
    setListForm({ name: '', description: '' })
  }

  const handleSaveSub = async (e) => {
    e.preventDefault()
    await addEmailSubscriber(subForm)
    refreshSubs()
    setShowSubForm(false)
    setSubForm({ email: '', name: '', listId: '', status: 'subscribed' })
  }

  if (loading) return <div className="dashboard"><div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Cargando...</div></div>

  return (
    <div className="dashboard">
      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon={Users} label="Suscriptores" value={totalSubs} />
        <StatCard icon={Send} label="Campanas" value={totalCampaigns} />
        <StatCard icon={Mail} label="Emails enviados" value={totalSent.toLocaleString()} />
        <StatCard icon={BarChart3} label="Tasa apertura" value={openRate + '%'} />
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

      {/* CAMPAIGNS TAB */}
      {tab === 'campaigns' && !showForm && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 18 }}>Campanas de Email</h3>
            <button onClick={() => { setShowForm(true); setEditItem(null) }} className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Nueva Campana</button>
          </div>
          {campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Send size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No hay campanas aun. Crea tu primera campana de email.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.subject || '(Sin asunto)'}</div>
                  </div>
                  <Badge status={c.status} />
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{c.totalSent || 0}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Enviados</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{c.totalOpened || 0}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Abiertos</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => { setEditItem(c); setShowForm(true) }} style={{ padding: 8, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-secondary)' }}><Edit3 size={14} /></button>
                    <button onClick={async () => { await deleteEmailCampaign(c.id); refreshCamps() }} style={{ padding: 8, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'campaigns' && showForm && (
        <>
          <button onClick={() => { setShowForm(false); setEditItem(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', border: 'none', background: 'none', color: 'var(--orange)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 12 }}><ArrowLeft size={14} /> Volver</button>
          <CampaignForm campaign={editItem} lists={lists} templates={templates} onSave={handleSaveCampaign} onCancel={() => { setShowForm(false); setEditItem(null) }} />
        </>
      )}

      {/* LISTS TAB */}
      {tab === 'lists' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 18 }}>Listas de Contactos</h3>
            <button onClick={() => { setShowListForm(true); setEditItem(null); setListForm({ name: '', description: '' }) }} className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Nueva Lista</button>
          </div>
          {showListForm && (
            <form onSubmit={handleSaveList} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre</label>
                  <input value={listForm.name} onChange={e => setListForm({ ...listForm, name: e.target.value })} required style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Descripcion</label>
                  <input value={listForm.description} onChange={e => setListForm({ ...listForm, description: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setShowListForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button type="submit" className="btn-action">Guardar</button>
              </div>
            </form>
          )}
          {lists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No hay listas. Crea tu primera lista de contactos.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {lists.map(l => {
                const count = subscribers.filter(s => s.listId === l.id && s.status === 'subscribed').length
                return (
                  <div key={l.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{l.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.description}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditItem(l); setListForm({ name: l.name, description: l.description || '' }); setShowListForm(true) }} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--text-secondary)' }}><Edit3 size={12} /></button>
                        <button onClick={async () => { await deleteEmailList(l.id); refreshLists() }} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,107,0,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={14} style={{ color: 'var(--orange)' }} />
                      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--orange)' }}>{count}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>suscriptores</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* TEMPLATES TAB */}
      {tab === 'templates' && !showForm && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 18 }}>Plantillas de Email</h3>
            <button onClick={() => { setShowForm(true); setEditItem(null) }} className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Nueva Plantilla</button>
          </div>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>No hay plantillas. Crea tu primera plantilla reutilizable.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {templates.map(t => (
                <div key={t.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: 140, background: '#fff', padding: 12, overflow: 'hidden' }}>
                    <div style={{ transform: 'scale(0.4)', transformOrigin: 'top left', width: '250%' }} dangerouslySetInnerHTML={{ __html: t.htmlContent || '<p style="color:#ccc;padding:20px">Sin contenido</p>' }} />
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{t.category}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setEditItem(t); setShowForm(true) }} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Edit3 size={12} /> Editar</button>
                      <button onClick={async () => { await deleteEmailTemplate(t.id); refreshTpls() }} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'templates' && showForm && (
        <>
          <button onClick={() => { setShowForm(false); setEditItem(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', border: 'none', background: 'none', color: 'var(--orange)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 12 }}><ArrowLeft size={14} /> Volver</button>
          <TemplateForm template={editItem} onSave={handleSaveTemplate} onCancel={() => { setShowForm(false); setEditItem(null) }} />
        </>
      )}

      {/* SUBSCRIBERS TAB */}
      {tab === 'subscribers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ color: 'var(--text)', margin: 0, fontSize: 18 }}>Suscriptores</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={selectedListId} onChange={e => setSelectedListId(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
                <option value="">Todas las listas</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ padding: '8px 12px 8px 30px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
              </div>
              <button onClick={() => setShowSubForm(true)} className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Anadir</button>
            </div>
          </div>
          {showSubForm && (
            <form onSubmit={handleSaveSub} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
                  <input type="email" value={subForm.email} onChange={e => setSubForm({ ...subForm, email: e.target.value })} required style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre</label>
                  <input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Lista</label>
                  <select value={subForm.listId} onChange={e => setSubForm({ ...subForm, listId: e.target.value })} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                    <option value="">Sin lista</option>
                    {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setShowSubForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button type="submit" className="btn-action">Anadir suscriptor</button>
              </div>
            </form>
          )}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Lista</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>No hay suscriptores</td></tr>
                ) : filteredSubs.map(s => {
                  const list = lists.find(l => l.id === s.listId)
                  return (
                    <tr key={s.id}>
                      <td className="cell-bold">{s.email}</td>
                      <td>{s.name || '—'}</td>
                      <td>{list?.name || '—'}</td>
                      <td><Badge status={s.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <button onClick={async () => { await deleteEmailSubscriber(s.id); refreshSubs() }} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
