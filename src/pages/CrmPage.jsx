import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useClientData } from '../hooks/useClientData'
import { useAsync } from '../hooks/useAsync'
import {
  Search, Plus, Settings, X, ChevronDown, ChevronLeft, ChevronRight,
  Phone, Mail, Building2, User, Tag, Calendar, DollarSign,
  Clock, MessageSquare, Video, FileText, Trash2, Edit3,
  Filter, LayoutGrid, List, Eye, Save, Globe, Hash, CheckSquare, Link, MailIcon,
  Palette, ArrowUp, ArrowDown, Upload, Paperclip, MapPin, ExternalLink,
  Check, Square,
} from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────────────────────
const DEFAULT_STATUSES = [
  { key: 'lead',        label: 'Lead',         color: '#6B7280' },
  { key: 'contacted',   label: 'Contactado',   color: '#3B82F6' },
  { key: 'qualified',   label: 'Cualificado',  color: '#8B5CF6' },
  { key: 'proposal',    label: 'Propuesta',    color: '#F59E0B' },
  { key: 'negotiation', label: 'Negociación',  color: '#FF6B00' },
  { key: 'won',         label: 'Ganado',       color: '#22C55E' },
  { key: 'lost',        label: 'Perdido',      color: '#EF4444' },
]

const ACTIVITY_TYPES = [
  { key: 'call',    label: 'Llamada',  icon: Phone },
  { key: 'email',   label: 'Email',    icon: Mail },
  { key: 'meeting', label: 'Reunión',  icon: Video },
  { key: 'note',    label: 'Nota',     icon: FileText },
]

const FIELD_TYPE_ICONS = {
  text: FileText, number: Hash, date: Calendar, select: ChevronDown,
  checkbox: CheckSquare, url: Link, email: MailIcon, phone: Phone, currency: DollarSign,
}
const FIELD_TYPES = ['text', 'number', 'date', 'select', 'checkbox', 'url', 'email', 'phone', 'currency']
const SOURCE_OPTIONS = ['Website', 'Referral', 'Social Media', 'Cold Call', 'Ad Campaign', 'Event', 'Other']
const STAGE_COLORS = [
  '#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B', '#FF6B00',
  '#22C55E', '#EF4444', '#EC4899', '#14B8A6', '#F97316',
  '#06B6D4', '#A855F7', '#84CC16', '#E11D48',
]

const FILTER_FIELDS = [
  { key: 'status', label: 'Estado', type: 'select' },
  { key: 'assigned_to', label: 'Asignado', type: 'select' },
  { key: 'source', label: 'Fuente', type: 'select' },
  { key: 'company', label: 'Empresa', type: 'text' },
  { key: 'country', label: 'País', type: 'text' },
  { key: 'tags', label: 'Tags', type: 'text' },
  { key: 'dealValue', label: 'Valor', type: 'number' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Teléfono', type: 'text' },
  { key: 'name', label: 'Nombre', type: 'text' },
  { key: 'notes', label: 'Notas', type: 'text' },
]
const FILTER_OPS = [
  { key: 'equals', label: 'es igual a' },
  { key: 'not_equals', label: 'no es igual a' },
  { key: 'contains', label: 'contiene' },
  { key: 'gt', label: 'mayor que' },
  { key: 'lt', label: 'menor que' },
  { key: 'is_empty', label: 'está vacío' },
  { key: 'is_not_empty', label: 'no está vacío' },
]

const emptyContact = {
  name: '', email: '', phone: '', company: '', status: 'lead',
  dealValue: '', assigned_to: '', source: '', tags: '', notes: '',
  address: '', whatsapp: '', zoom_link: '', website: '', linkedin: '',
  pipelineId: '', customFields: {},
}

// ─── Utility ────────────────────────────────────────────────────────────────────
const fmt = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const generateFieldKey = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

// ─── Filter matching ────────────────────────────────────────────────────────────
function matchesFilter(contact, filter) {
  const { field, op, value } = filter
  const cv = String(contact[field] || '')
  switch (op) {
    case 'equals': return cv === value
    case 'not_equals': return cv !== value
    case 'contains': return cv.toLowerCase().includes((value || '').toLowerCase())
    case 'gt': return Number(cv) > Number(value)
    case 'lt': return Number(cv) < Number(value)
    case 'is_empty': return !cv || cv === '—'
    case 'is_not_empty': return !!cv && cv !== '—'
    default: return true
  }
}

// ─── Shared Styles ──────────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%', padding: '8px 10px', background: 'var(--bg-card)',
    border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  },
  inputSm: {
    width: '100%', padding: '6px 8px', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)',
    fontSize: 11, outline: 'none', boxSizing: 'border-box',
  },
  label: { fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' },
  sectionLabel: {
    fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10,
  },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
    background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.25)',
    borderRadius: 20, fontSize: 11, color: 'var(--orange)', fontWeight: 600,
  },
  btnGhost: {
    padding: '5px 12px', background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12,
  },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000 },
  modal: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    maxWidth: '95vw', maxHeight: '85vh', background: 'var(--bg-card)',
    border: '1px solid var(--border)', borderRadius: 14,
    boxShadow: '0 12px 48px rgba(0,0,0,.5)', zIndex: 1001,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  modalHeader: {
    padding: '16px 20px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
}

// ═════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════════
export default function CrmPage() {
  const {
    getCrmContacts, addCrmContact, updateCrmContact, deleteCrmContact,
    getCrmActivities, addCrmActivity, deleteCrmActivity,
    getCrmCustomFields, addCrmCustomField, updateCrmCustomField, deleteCrmCustomField,
    getCrmSmartViews, addCrmSmartView, updateCrmSmartView, deleteCrmSmartView,
    getCrmPipelines, addCrmPipeline, updateCrmPipeline, deleteCrmPipeline,
    getCrmFiles, addCrmFile, deleteCrmFile,
    getCrmTasks, addCrmTask, updateCrmTask, deleteCrmTask,
    getTeam,
  } = useClientData()

  const [contacts, contactsLoading, refreshContacts] = useAsync(getCrmContacts, [])
  const [customFields, , refreshFields] = useAsync(getCrmCustomFields, [])
  const [smartViews, , refreshViews] = useAsync(getCrmSmartViews, [])
  const [pipelines, , refreshPipelines] = useAsync(getCrmPipelines, [])
  const [team] = useAsync(getTeam, [])

  // ─── Pipeline selection ───────────────────────────────────────────────────
  const [activePipelineId, setActivePipelineId] = useState(null)
  const activePipeline = useMemo(() => {
    if (!pipelines?.length) return null
    if (activePipelineId) return pipelines.find(p => p.id === activePipelineId) || pipelines[0]
    return pipelines.find(p => p.isDefault) || pipelines[0]
  }, [pipelines, activePipelineId])

  const STATUSES = useMemo(() => activePipeline?.stages || DEFAULT_STATUSES, [activePipeline])
  const STATUS_MAP = useMemo(() => Object.fromEntries(STATUSES.map(s => [s.key, s])), [STATUSES])

  // ─── UI State ─────────────────────────────────────────────────────────────
  const [view, setView] = useState('kanban') // kanban | list | calendar
  const [search, setSearch] = useState('')
  const [activeViewId, setActiveViewId] = useState(null)
  const [showNewContact, setShowNewContact] = useState(false)
  const [showCustomFields, setShowCustomFields] = useState(false)
  const [showPipelineEditor, setShowPipelineEditor] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [draggedId, setDraggedId] = useState(null)
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false)

  // ─── Advanced Filters ─────────────────────────────────────────────────────
  const [filters, setFilters] = useState([]) // [{field, op, value}]
  const [showFilterAdd, setShowFilterAdd] = useState(false)

  // ─── Smart View state ─────────────────────────────────────────────────────
  const [svCreating, setSvCreating] = useState(false)
  const [svEditing, setSvEditing] = useState(null)
  const [svForm, setSvForm] = useState({ name: '', filters: [] })

  const selectSmartView = (id) => {
    setActiveViewId(id)
    if (id) {
      const sv = smartViews.find(v => v.id === id)
      if (sv?.filters) {
        setFilters(Array.isArray(sv.filters) ? [...sv.filters] : [])
      }
    } else {
      setFilters([])
    }
  }

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    let list = [...contacts]
    // Pipeline filter
    if (activePipeline) {
      list = list.filter(c => !c.pipelineId || c.pipelineId === activePipeline.id)
    }
    // Search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      )
    }
    // Advanced filters
    for (const f of filters) {
      if (f.field && f.op) list = list.filter(c => matchesFilter(c, f))
    }
    return list
  }, [contacts, search, filters, activePipeline])

  const sortedContacts = useMemo(() => {
    const list = [...filteredContacts]
    list.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (sortCol === 'dealValue') { va = Number(va) || 0; vb = Number(vb) || 0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filteredContacts, sortCol, sortDir])

  const kanbanColumns = useMemo(() =>
    STATUSES.map(s => {
      const items = filteredContacts.filter(c => c.status === s.key)
      const total = items.reduce((sum, c) => sum + (Number(c.dealValue) || 0), 0)
      return { ...s, items, total }
    }), [filteredContacts, STATUSES])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const openContact = (contact) => setSelectedContact(contact)
  const closeContact = () => setSelectedContact(null)

  const handleSaveNewContact = async (e) => {
    e.preventDefault()
    const form = e.target
    const fd = new FormData(form)
    const payload = {
      name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
      company: fd.get('company'), status: fd.get('status') || 'lead',
      dealValue: Number(fd.get('dealValue')) || 0,
      assigned_to: fd.get('assigned_to'), source: fd.get('source'),
      tags: fd.get('tags'), notes: fd.get('notes'),
      address: fd.get('address'), whatsapp: fd.get('whatsapp'),
      zoom_link: fd.get('zoom_link'), website: fd.get('website'),
      linkedin: fd.get('linkedin'),
      pipelineId: activePipeline?.id || '',
      customFields: {},
    }
    try {
      await addCrmContact(payload)
      refreshContacts()
      setShowNewContact(false)
    } catch (err) { alert('Error al guardar contacto.') }
  }

  const handleUpdateContact = async (updates) => {
    if (!selectedContact) return
    try {
      await updateCrmContact(selectedContact.id, updates)
      refreshContacts()
      setSelectedContact(prev => ({ ...prev, ...updates }))
    } catch (err) { console.error('Error updating contact:', err) }
  }

  const handleDeleteContact = async () => {
    if (!selectedContact || !confirm('¿Eliminar este contacto?')) return
    await deleteCrmContact(selectedContact.id)
    refreshContacts()
    closeContact()
  }

  const handleStatusChange = async (contactId, newStatus) => {
    await updateCrmContact(contactId, { status: newStatus })
    refreshContacts()
    if (selectedContact?.id === contactId) setSelectedContact(prev => ({ ...prev, status: newStatus }))
  }

  // ─── Filter helpers ───────────────────────────────────────────────────────
  const addFilter = (field) => {
    setFilters(prev => [...prev, { field, op: 'equals', value: '' }])
    setShowFilterAdd(false)
  }
  const updateFilter = (idx, updates) => setFilters(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f))
  const removeFilter = (idx) => setFilters(prev => prev.filter((_, i) => i !== idx))
  const clearFilters = () => { setFilters([]); setActiveViewId(null) }

  // ─── Smart View Handlers ──────────────────────────────────────────────────
  const svStartCreate = () => {
    setSvForm({ name: '', filters: [...filters] })
    setSvCreating(true); setSvEditing(null)
  }
  const svStartEdit = (v) => {
    setSvForm({ name: v.name, filters: Array.isArray(v.filters) ? [...v.filters] : [] })
    setSvEditing(v.id); setSvCreating(false)
  }
  const svHandleSave = async () => {
    if (!svForm.name.trim()) return
    try {
      if (svEditing) await updateCrmSmartView(svEditing, svForm)
      else await addCrmSmartView(svForm)
      refreshViews(); setSvCreating(false); setSvEditing(null)
    } catch (err) { console.error('Error saving smart view:', err) }
  }
  const svHandleDelete = async (id) => {
    if (!confirm('¿Eliminar esta vista?')) return
    await deleteCrmSmartView(id)
    refreshViews()
    if (activeViewId === id) selectSmartView(null)
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const onDragStart = (e, contactId) => {
    setDraggedId(contactId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', contactId)
  }
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const onDrop = async (e, statusKey) => {
    e.preventDefault()
    const id = draggedId || e.dataTransfer.getData('text/plain')
    if (!id) return
    setDraggedId(null)
    await handleStatusChange(id, statusKey)
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (contactsLoading) {
    return <div className="dashboard"><div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Cargando CRM...</div></div>
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="dashboard" style={{ position: 'relative', overflow: 'hidden' }}>

      {/* ─── Top Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        marginBottom: 0, padding: '0 0 16px', borderBottom: '1px solid var(--border)',
      }}>
        {/* Pipeline Selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 700,
            }}
          >
            {activePipeline?.name || 'Pipeline'} <ChevronDown size={14} />
          </button>
          {showPipelineDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: 200,
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,.4)', zIndex: 100, overflow: 'hidden',
            }}>
              {pipelines.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setActivePipelineId(p.id); setShowPipelineDropdown(false) }}
                  style={{
                    padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                    background: p.id === activePipeline?.id ? 'rgba(255,107,0,.1)' : 'transparent',
                    color: p.id === activePipeline?.id ? 'var(--orange)' : 'var(--text)',
                    fontWeight: p.id === activePipeline?.id ? 700 : 400,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = p.id === activePipeline?.id ? 'rgba(255,107,0,.1)' : 'transparent'}
                >
                  {p.name} {p.isDefault && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>(default)</span>}
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', padding: '6px 8px' }}>
                <button
                  onClick={() => { setShowPipelineDropdown(false); setShowPipelineEditor(true) }}
                  style={{
                    width: '100%', padding: '6px', display: 'flex', alignItems: 'center', gap: 6,
                    background: 'transparent', border: '1px dashed var(--border)', borderRadius: 6,
                    cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, justifyContent: 'center',
                  }}
                >
                  <Settings size={12} /> Gestionar Pipelines
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View toggles */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {[
            { key: 'kanban', label: 'Kanban', Icon: LayoutGrid },
            { key: 'list', label: 'Lista', Icon: List },
            { key: 'calendar', label: 'Calendario', Icon: Calendar },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px',
                background: view === v.key ? 'var(--orange)' : 'var(--bg-card)',
                color: view === v.key ? '#000' : 'var(--text-secondary)',
                border: 'none', borderLeft: v.key !== 'kanban' ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .2s',
              }}
            >
              <v.Icon size={14} /> {v.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, flex: '1 1 200px', maxWidth: 320,
        }}>
          <Search size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar contactos..."
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, width: '100%' }}
          />
          {search && <X size={14} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setSearch('')} />}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCustomFields(true)}
            style={{ ...S.btnGhost, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}
            title="Campos Personalizados">
            <Settings size={15} />
          </button>
          <button className="btn-action" onClick={() => setShowNewContact(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Nuevo Contacto
          </button>
        </div>
      </div>

      {/* ─── Main Layout: Sidebar + Content ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, marginTop: 0 }}>

        {/* ─── Smart Views Left Sidebar ──────────────────────────────────── */}
        <div style={{
          width: 220, minWidth: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', overflowY: 'auto',
          background: 'rgba(255,255,255,.01)',
        }}>
          <div style={{ padding: '14px 14px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Vistas
          </div>
          <SidebarViewItem label="Todos los contactos" icon={<Filter size={13} />}
            active={!activeViewId} onClick={() => selectSmartView(null)} count={contacts.length} />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 12px' }} />
          {smartViews.map(v => (
            <SidebarViewItem key={v.id} label={v.name} icon={<Eye size={13} />}
              active={activeViewId === v.id} onClick={() => selectSmartView(v.id)}
              onEdit={() => svStartEdit(v)} onDelete={() => svHandleDelete(v.id)} />
          ))}
          {smartViews.length === 0 && !svCreating && (
            <div style={{ padding: '16px 14px', fontSize: 11, color: 'var(--text-secondary)', opacity: 0.5, textAlign: 'center' }}>
              Sin vistas guardadas
            </div>
          )}
          {/* SV Create/Edit */}
          {(svCreating || svEditing) && (
            <div style={{ margin: '4px 8px', padding: 10, background: 'rgba(255,107,0,.04)', border: '1px solid rgba(255,107,0,.2)', borderRadius: 8 }}>
              <input value={svForm.name} onChange={e => setSvForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nombre de la vista" autoFocus style={{ ...S.inputSm, marginBottom: 6 }} />
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Filtros actuales ({filters.length}) se guardarán con la vista
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { setSvCreating(false); setSvEditing(null) }}
                  style={{ flex: 1, padding: '4px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 10 }}>
                  Cancelar
                </button>
                <button onClick={() => { setSvForm(p => ({ ...p, filters: [...filters] })); svHandleSave() }}
                  style={{ flex: 1, padding: '4px', background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                  {svEditing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          )}
          <div style={{ flex: 1 }} />
          {!svCreating && !svEditing && (
            <button onClick={svStartCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', margin: '8px',
                background: 'transparent', border: '1px dashed var(--border)', borderRadius: 8,
                cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
                width: 'calc(100% - 16px)', boxSizing: 'border-box', transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <Plus size={13} /> Nueva vista
            </button>
          )}
        </div>

        {/* ─── Right Content Area ────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 16, paddingTop: 16 }}>

          {/* Pipeline Summary Strip */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4, alignItems: 'center' }}>
            {STATUSES.map(s => {
              const count = filteredContacts.filter(c => c.status === s.key).length
              return (
                <div key={s.key} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 20, fontSize: 12, whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{count}</span>
                </div>
              )
            })}
          </div>

          {/* ─── Advanced Filters ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {filters.map((f, idx) => {
              const ff = FILTER_FIELDS.find(x => x.key === f.field)
              return (
                <div key={idx} style={S.pill}>
                  <select value={f.field} onChange={e => updateFilter(idx, { field: e.target.value })}
                    style={{ background: 'transparent', border: 'none', color: 'var(--orange)', fontSize: 11, fontWeight: 600, outline: 'none' }}>
                    {FILTER_FIELDS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </select>
                  <select value={f.op} onChange={e => updateFilter(idx, { op: e.target.value })}
                    style={{ background: 'transparent', border: 'none', color: 'var(--orange)', fontSize: 10, outline: 'none' }}>
                    {FILTER_OPS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                  {!['is_empty', 'is_not_empty'].includes(f.op) && (
                    ff?.type === 'select' ? (
                      <select value={f.value || ''} onChange={e => updateFilter(idx, { value: e.target.value })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--orange)', fontSize: 11, outline: 'none', maxWidth: 90 }}>
                        <option value="">--</option>
                        {f.field === 'status' && STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        {f.field === 'assigned_to' && team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        {f.field === 'source' && SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input value={f.value || ''} onChange={e => updateFilter(idx, { value: e.target.value })}
                        placeholder="..." style={{ background: 'transparent', border: 'none', color: 'var(--orange)', fontSize: 11, outline: 'none', width: 60 }} />
                    )
                  )}
                  <X size={12} style={{ cursor: 'pointer', opacity: .7 }} onClick={() => removeFilter(idx)} />
                </div>
              )
            })}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowFilterAdd(!showFilterAdd)}
                style={{ ...S.btnGhost, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 10px' }}>
                <Plus size={12} /> Filtro
              </button>
              {showFilterAdd && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: 160,
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,.4)', zIndex: 50, maxHeight: 200, overflowY: 'auto',
                }}>
                  {FILTER_FIELDS.map(f => (
                    <div key={f.key} onClick={() => addFilter(f.key)}
                      style={{ padding: '7px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--text)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {f.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {filters.length > 0 && (
              <button onClick={clearFilters}
                style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(239,68,68,.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,.25)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Limpiar
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
              {filteredContacts.length} contacto{filteredContacts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ─── Kanban View ──────────────────────────────────────────────── */}
          {view === 'kanban' && (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, minHeight: 'calc(100vh - 340px)' }}>
              {kanbanColumns.map(col => (
                <div key={col.key} onDragOver={onDragOver} onDrop={e => onDrop(e, col.key)}
                  style={{
                    minWidth: 260, maxWidth: 300, flex: '0 0 260px', display: 'flex', flexDirection: 'column',
                    background: 'rgba(255,255,255,.02)', borderRadius: 12, border: '1px solid var(--border)',
                  }}>
                  <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `2px solid ${col.color}` }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', flex: 1 }}>{col.label}</span>
                    <span style={{ fontSize: 11, background: `${col.color}22`, color: col.color, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      {col.items.length}
                    </span>
                  </div>
                  {col.total > 0 && (
                    <div style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                      Total: {fmt(col.total)}
                    </div>
                  )}
                  <div style={{ padding: 8, flex: 1, overflowY: 'auto' }}>
                    {col.items.length === 0 && (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, opacity: 0.5 }}>Sin contactos</div>
                    )}
                    {col.items.map(c => (
                      <KanbanCard key={c.id} contact={c} onDragStart={onDragStart} onClick={() => openContact(c)} isDragging={draggedId === c.id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── List View ────────────────────────────────────────────────── */}
          {view === 'list' && (
            <div className="data-table"><div className="table-wrapper"><table>
              <thead><tr>
                {[
                  { key: 'name', label: 'Nombre' }, { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Teléfono' }, { key: 'company', label: 'Empresa' },
                  { key: 'status', label: 'Estado' }, { key: 'dealValue', label: 'Valor' },
                  { key: 'assigned_to', label: 'Asignado' }, { key: 'source', label: 'Fuente' },
                  { key: 'created_at', label: 'Creado' },
                ].map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {col.label}{sortCol === col.key && <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {sortedContacts.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>No hay contactos</td></tr>
                )}
                {sortedContacts.map(c => (
                  <tr key={c.id} onClick={() => openContact(c)} style={{ cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.phone || '—'}</td>
                    <td>{c.company || '—'}</td>
                    <td>
                      <select value={c.status} onClick={e => e.stopPropagation()} onChange={e => handleStatusChange(c.id, e.target.value)}
                        style={{
                          background: `${STATUS_MAP[c.status]?.color || '#666'}22`, color: STATUS_MAP[c.status]?.color || '#999',
                          border: `1px solid ${STATUS_MAP[c.status]?.color || '#666'}44`, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', outline: 'none',
                        }}>
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--orange)' }}>{fmt(c.dealValue)}</td>
                    <td style={{ fontSize: 12 }}>{c.assigned_to || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.source || '—'}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div></div>
          )}

          {/* ─── Calendar View ────────────────────────────────────────────── */}
          {view === 'calendar' && (
            <CalendarView
              contacts={filteredContacts}
              getCrmActivities={getCrmActivities}
              onContactClick={openContact}
            />
          )}
        </div>
      </div>

      {/* ─── Contact Detail Sidebar ───────────────────────────────────── */}
      {selectedContact && (
        <ContactSidebar
          contact={selectedContact} customFields={customFields} team={team}
          statuses={STATUSES} statusMap={STATUS_MAP}
          onClose={closeContact} onUpdate={handleUpdateContact} onDelete={handleDeleteContact}
          onStatusChange={handleStatusChange}
          getCrmActivities={getCrmActivities} addCrmActivity={addCrmActivity} deleteCrmActivity={deleteCrmActivity}
          getCrmFiles={getCrmFiles} addCrmFile={addCrmFile} deleteCrmFile={deleteCrmFile}
          getCrmTasks={getCrmTasks} addCrmTask={addCrmTask} updateCrmTask={updateCrmTask} deleteCrmTask={deleteCrmTask}
        />
      )}

      {/* ─── Pipeline Editor Modal ──────────────────────────────────────── */}
      {showPipelineEditor && (
        <PipelineEditorModal
          pipelines={pipelines || []}
          activePipeline={activePipeline}
          onClose={() => setShowPipelineEditor(false)}
          onSavePipeline={async (id, data) => {
            try {
              if (id) await updateCrmPipeline(id, data)
              else { const p = await addCrmPipeline(data); setActivePipelineId(p?.id) }
              refreshPipelines()
            } catch (err) { alert('Error al guardar pipeline.') }
          }}
          onDeletePipeline={async (id) => {
            if (!confirm('¿Eliminar este pipeline?')) return
            await deleteCrmPipeline(id)
            refreshPipelines()
            if (activePipelineId === id) setActivePipelineId(null)
          }}
        />
      )}

      {/* ─── Custom Fields Modal ──────────────────────────────────────── */}
      {showCustomFields && (
        <CustomFieldsModal fields={customFields} onClose={() => setShowCustomFields(false)}
          onAdd={addCrmCustomField} onUpdate={updateCrmCustomField} onDelete={deleteCrmCustomField} refresh={refreshFields} />
      )}

      {/* ─── New Contact Modal ────────────────────────────────────────── */}
      {showNewContact && (
        <NewContactModal customFields={customFields} team={team} statuses={STATUSES}
          onClose={() => setShowNewContact(false)} onSave={handleSaveNewContact} />
      )}

      {/* Click away for filter dropdown */}
      {showFilterAdd && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowFilterAdd(false)} />}
      {showPipelineDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowPipelineDropdown(false)} />}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// SIDEBAR VIEW ITEM
// ═════════════════════════════════════════════════════════════════════════════════
function SidebarViewItem({ label, icon, active, onClick, onEdit, onDelete, count }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer',
        background: active ? 'rgba(255,107,0,.1)' : hovered ? 'rgba(255,255,255,.03)' : 'transparent',
        borderLeft: active ? '3px solid var(--orange)' : '3px solid transparent', transition: 'all .12s',
      }}>
      <span style={{ color: active ? 'var(--orange)' : 'var(--text-secondary)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: active ? 'var(--orange)' : 'var(--text)', fontWeight: active ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, background: 'rgba(255,255,255,.05)', padding: '1px 6px', borderRadius: 8 }}>{count}</span>
      )}
      {hovered && onEdit && (
        <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} style={{ padding: 3, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1 }}>
            <Edit3 size={11} />
          </button>
          <button onClick={onDelete} style={{ padding: 3, background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', lineHeight: 1 }}>
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// KANBAN CARD
// ═════════════════════════════════════════════════════════════════════════════════
function KanbanCard({ contact, onDragStart, onClick, isDragging }) {
  const c = contact
  const tags = (c.tags || '').split(',').map(t => t.trim()).filter(Boolean)
  return (
    <div draggable onDragStart={e => onDragStart(e, c.id)} onClick={onClick}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 8,
        cursor: 'grab', transition: 'all .2s', opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(.95)' : 'none', boxShadow: '0 1px 3px rgba(0,0,0,.15)',
      }}
      onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,107,0,.12)' } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.15)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{c.name || 'Sin nombre'}</div>
      {c.company && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}><Building2 size={11} /> {c.company}</div>}
      {Number(c.dealValue) > 0 && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)', marginBottom: 6 }}>{fmt(c.dealValue)}</div>}
      {c.assigned_to && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}><User size={11} /> {c.assigned_to}</div>}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tags.slice(0, 3).map(t => (
            <span key={t} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, background: 'rgba(255,107,0,.12)', color: 'var(--orange)', fontWeight: 600 }}>{t}</span>
          ))}
          {tags.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>+{tags.length - 3}</span>}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// CALENDAR VIEW
// ═════════════════════════════════════════════════════════════════════════════════
function CalendarView({ contacts, getCrmActivities, onContactClick }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [allActivities, setAllActivities] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const acts = []
      for (const c of contacts.slice(0, 100)) {
        try {
          const a = await getCrmActivities(c.id)
          acts.push(...a.map(x => ({ ...x, contactName: c.name, contactId: c.id })))
        } catch {}
      }
      if (!cancelled) setAllActivities(acts)
    }
    load()
    return () => { cancelled = true }
  }, [contacts, getCrmActivities, month])

  const year = month.getFullYear(), mo = month.getMonth()
  const firstDay = new Date(year, mo, 1).getDay() || 7 // Mon=1
  const daysInMonth = new Date(year, mo + 1, 0).getDate()
  const weeks = Math.ceil((firstDay - 1 + daysInMonth) / 7)
  const monthName = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const scheduledActivities = useMemo(() =>
    allActivities.filter(a => a.scheduledAt && ['meeting', 'call'].includes(a.type)),
    [allActivities])

  const getActivitiesForDay = (day) => {
    return scheduledActivities.filter(a => {
      const d = new Date(a.scheduledAt)
      return d.getFullYear() === year && d.getMonth() === mo && d.getDate() === day
    })
  }

  const today = new Date()
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === mo && today.getDate() === day

  const dayEvents = selectedDay ? getActivitiesForDay(selectedDay) : []

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setMonth(new Date(year, mo - 1, 1))} style={{ ...S.btnGhost, padding: '6px 8px' }}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>{monthName}</span>
        <button onClick={() => setMonth(new Date(year, mo + 1, 1))} style={{ ...S.btnGhost, padding: '6px 8px' }}><ChevronRight size={16} /></button>
      </div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const day = i - (firstDay - 2)
          const valid = day >= 1 && day <= daysInMonth
          const acts = valid ? getActivitiesForDay(day) : []
          return (
            <div key={i} onClick={() => valid && setSelectedDay(day === selectedDay ? null : day)}
              style={{
                minHeight: 72, padding: 6, background: valid ? 'var(--bg-card)' : 'transparent',
                border: valid ? `1px solid ${selectedDay === day ? 'var(--orange)' : 'var(--border)'}` : 'none',
                borderRadius: 6, cursor: valid ? 'pointer' : 'default', transition: 'all .15s',
              }}>
              {valid && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: isToday(day) ? 800 : 500,
                    color: isToday(day) ? 'var(--orange)' : 'var(--text)',
                    marginBottom: 4,
                  }}>{day}</div>
                  {acts.slice(0, 3).map((a, j) => (
                    <div key={j} style={{
                      fontSize: 9, padding: '1px 4px', marginBottom: 1, borderRadius: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      background: a.type === 'meeting' ? 'rgba(139,92,246,.2)' : 'rgba(59,130,246,.2)',
                      color: a.type === 'meeting' ? '#A78BFA' : '#60A5FA',
                    }}>{a.contactName}</div>
                  ))}
                  {acts.length > 3 && <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>+{acts.length - 3}</div>}
                </>
              )}
            </div>
          )
        })}
      </div>
      {/* Selected day events */}
      {selectedDay && (
        <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 8 }}>{selectedDay} {monthName} - Eventos ({dayEvents.length})</div>
          {dayEvents.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: .5 }}>Sin eventos</div>}
          {dayEvents.map((a, i) => {
            const at = ACTIVITY_TYPES.find(x => x.key === a.type) || ACTIVITY_TYPES[3]
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => { const c = contacts.find(x => x.id === a.contactId); if (c) onContactClick(c) }}>
                <at.icon size={13} style={{ color: 'var(--orange)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{a.contactName}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.description?.slice(0, 40)}</span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 'auto' }}>{fmtDateTime(a.scheduledAt)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// CONTACT SIDEBAR (with tabs: Details / Files)
// ═════════════════════════════════════════════════════════════════════════════════
function ContactSidebar({
  contact, customFields, team, statuses, statusMap, onClose, onUpdate, onDelete, onStatusChange,
  getCrmActivities, addCrmActivity, deleteCrmActivity,
  getCrmFiles, addCrmFile, deleteCrmFile,
  getCrmTasks, addCrmTask, updateCrmTask, deleteCrmTask,
}) {
  const STATUSES = statuses
  const [tab, setTab] = useState('details') // details | files
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  // Activities
  const [activities, activitiesLoading, refreshActivities] = useAsync(
    useCallback(() => getCrmActivities(contact.id), [contact.id]), []
  )
  const [newActivity, setNewActivity] = useState({ type: 'note', description: '', scheduledAt: '' })
  const [showActivityForm, setShowActivityForm] = useState(false)

  // Tasks
  const [tasks, , refreshTasks] = useAsync(
    useCallback(() => getCrmTasks(contact.id), [contact.id]), []
  )
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Files
  const [files, , refreshFiles] = useAsync(
    useCallback(() => getCrmFiles(contact.id), [contact.id]), []
  )
  const fileInputRef = useRef(null)

  // Notes editing
  const [notesEdit, setNotesEdit] = useState(null)

  const s = statusMap[contact.status] || STATUSES[0]

  const startEditing = () => {
    setEditForm({
      name: contact.name || '', email: contact.email || '', phone: contact.phone || '',
      company: contact.company || '', dealValue: contact.dealValue || '',
      assigned_to: contact.assigned_to || '', source: contact.source || '',
      tags: contact.tags || '', address: contact.address || '',
      whatsapp: contact.whatsapp || '', zoom_link: contact.zoom_link || '',
      website: contact.website || '', linkedin: contact.linkedin || '',
      customFields: contact.customFields || {},
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    await onUpdate({ ...editForm, dealValue: Number(editForm.dealValue) || 0 })
    setEditing(false)
  }

  const handleAddActivity = async (e) => {
    e.preventDefault()
    if (!newActivity.description.trim()) return
    await addCrmActivity({
      contact_id: contact.id, type: newActivity.type,
      description: newActivity.description,
      scheduledAt: newActivity.scheduledAt || undefined,
    })
    refreshActivities()
    setNewActivity({ type: 'note', description: '', scheduledAt: '' })
    setShowActivityForm(false)
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return
    await addCrmTask({ contact_id: contact.id, title: newTaskTitle, completed: false })
    refreshTasks(); setNewTaskTitle('')
  }

  const handleToggleTask = async (task) => {
    await updateCrmTask(task.id, { completed: !task.completed })
    refreshTasks()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await addCrmFile({ contact_id: contact.id, name: file.name, size: file.size, type: file.type })
    refreshFiles()
  }

  const handleSaveNotes = async () => {
    if (notesEdit === null) return
    await onUpdate({ notes: notesEdit })
    setNotesEdit(null)
  }

  // ─── About section link helper ────────────────────────────────────────
  const LinkRow = ({ icon, label, value, href }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
      <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 70, flexShrink: 0 }}>{label}</span>
      {href && value ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--orange)', textDecoration: 'none', fontWeight: 500 }}>
          {value} <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
        </a>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value || '—'}</span>
      )}
    </div>
  )

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, maxWidth: '100vw',
        background: 'var(--bg)', borderLeft: '1px solid var(--border)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', animation: 'slideInRight .25s ease-out',
        boxShadow: '-8px 0 30px rgba(0,0,0,.3)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, background: `${s.color}22`, color: s.color }}>
            {(contact.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name || 'Sin nombre'}</div>
            {contact.company && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{contact.company}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editing && <button onClick={startEditing} style={{ ...S.btnGhost, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Edit3 size={13} /> Editar</button>}
            <button onClick={onDelete} style={{ padding: '6px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', fontSize: 12 }}><Trash2 size={13} /></button>
            <button onClick={onClose} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[{ key: 'details', label: 'Detalles' }, { key: 'files', label: 'Archivos' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '10px', background: 'transparent', border: 'none',
                borderBottom: tab === t.key ? '2px solid var(--orange)' : '2px solid transparent',
                color: tab === t.key ? 'var(--orange)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {tab === 'details' && (
            <>
              {/* Status buttons */}
              <div style={{ marginBottom: 20 }}>
                <div style={S.sectionLabel}>Estado</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {STATUSES.map(st => (
                    <button key={st.key} onClick={() => onStatusChange(contact.id, st.key)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: contact.status === st.key ? `${st.color}33` : 'var(--bg-card)',
                        color: contact.status === st.key ? st.color : 'var(--text-secondary)',
                        border: contact.status === st.key ? `1px solid ${st.color}` : '1px solid var(--border)',
                      }}>
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ABOUT section */}
              {!editing ? (
                <div style={{ marginBottom: 24 }}>
                  <div style={S.sectionLabel}>Información</div>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <LinkRow icon={<Mail size={13} />} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : null} />
                    <LinkRow icon={<Phone size={13} />} label="Teléfono" value={contact.phone} />
                    <LinkRow icon={<Building2 size={13} />} label="Empresa" value={contact.company} />
                    <LinkRow icon={<DollarSign size={13} />} label="Valor" value={fmt(contact.dealValue)} />
                    <LinkRow icon={<User size={13} />} label="Asignado" value={contact.assigned_to} />
                    <LinkRow icon={<Globe size={13} />} label="Fuente" value={contact.source} />
                    <LinkRow icon={<MapPin size={13} />} label="Dirección" value={contact.address} />
                    <LinkRow icon={<MessageSquare size={13} />} label="WhatsApp" value={contact.whatsapp}
                      href={contact.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}` : null} />
                    <LinkRow icon={<Video size={13} />} label="Zoom" value={contact.zoom_link ? 'Enlace' : ''}
                      href={contact.zoom_link} />
                    <LinkRow icon={<Globe size={13} />} label="Website" value={contact.website ? 'Visitar' : ''}
                      href={contact.website} />
                    <LinkRow icon={<Link size={13} />} label="LinkedIn" value={contact.linkedin ? 'Perfil' : ''}
                      href={contact.linkedin} />
                    <LinkRow icon={<Calendar size={13} />} label="Creado" value={fmtDate(contact.created_at)} />
                  </div>
                  {contact.tags && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0' }}>
                      <Tag size={13} style={{ color: 'var(--text-secondary)', marginTop: 2 }} />
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {contact.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                          <span key={t} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(255,107,0,.12)', color: 'var(--orange)', fontWeight: 600 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Custom fields display */}
                  {customFields.length > 0 && contact.customFields && Object.keys(contact.customFields).length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={S.sectionLabel}>Campos Personalizados</div>
                      {customFields.map(f => {
                        const val = contact.customFields?.[f.field_key || f.id || f.name]
                        if (val === undefined || val === '') return null
                        return (
                          <div key={f.id || f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{f.type === 'checkbox' ? (val ? 'Sí' : 'No') : String(val)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Edit Form */
                <div style={{ marginBottom: 24 }}>
                  <div style={S.sectionLabel}>Editar Información</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      { label: 'Nombre', key: 'name' }, { label: 'Email', key: 'email', type: 'email' },
                      { label: 'Teléfono', key: 'phone' }, { label: 'Empresa', key: 'company' },
                      { label: 'Valor del Trato', key: 'dealValue', type: 'number' },
                      { label: 'Dirección', key: 'address' }, { label: 'WhatsApp', key: 'whatsapp' },
                      { label: 'Zoom Link', key: 'zoom_link', type: 'url' },
                      { label: 'Website', key: 'website', type: 'url' },
                      { label: 'LinkedIn', key: 'linkedin', type: 'url' },
                      { label: 'Tags', key: 'tags' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={S.label}>{f.label}</label>
                        <input type={f.type || 'text'} value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} style={S.input} />
                      </div>
                    ))}
                    <div>
                      <label style={S.label}>Asignado a</label>
                      <select value={editForm.assigned_to} onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))} style={S.input}>
                        <option value="">— Sin asignar —</option>
                        {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Fuente</label>
                      <select value={editForm.source} onChange={e => setEditForm(p => ({ ...p, source: e.target.value }))} style={S.input}>
                        <option value="">— Seleccionar —</option>
                        {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {customFields.map(f => (
                      <CustomFieldInput key={f.id || f.name} field={f} value={editForm.customFields?.[f.field_key || f.id || f.name] || ''}
                        onChange={v => setEditForm(p => ({ ...p, customFields: { ...p.customFields, [f.field_key || f.id || f.name]: v } }))} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => setEditing(false)} style={{ ...S.btnGhost, flex: 1, padding: '8px', fontSize: 13 }}>Cancelar</button>
                    <button onClick={saveEdit} className="btn-action" style={{ flex: 1, padding: '8px', fontSize: 13 }}><Save size={13} style={{ marginRight: 4 }} /> Guardar</button>
                  </div>
                </div>
              )}

              {/* TASKS section */}
              <div style={{ marginBottom: 24 }}>
                <div style={S.sectionLabel}>Tareas</div>
                {(tasks || []).map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <button onClick={() => handleToggleTask(t)}
                      style={{ padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: t.completed ? 'var(--orange)' : 'var(--text-secondary)' }}>
                      {t.completed ? <Check size={16} /> : <Square size={16} />}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text)', textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? .5 : 1, flex: 1 }}>{t.title}</span>
                    <button onClick={() => { if (confirm('¿Eliminar tarea?')) { deleteCrmTask(t.id); refreshTasks() } }}
                      style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', opacity: .4 }}><Trash2 size={11} /></button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Nueva tarea..."
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    style={{ ...S.input, flex: 1, fontSize: 12, padding: '6px 8px' }} />
                  <button onClick={handleAddTask} style={{ padding: '6px 10px', background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* NOTES section */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={S.sectionLabel}>Notas</span>
                  {notesEdit === null ? (
                    <button onClick={() => setNotesEdit(contact.notes || '')} style={{ ...S.btnGhost, fontSize: 10, padding: '3px 8px' }}><Edit3 size={10} /></button>
                  ) : (
                    <button onClick={handleSaveNotes} style={{ padding: '3px 8px', background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>Guardar</button>
                  )}
                </div>
                {notesEdit !== null ? (
                  <textarea value={notesEdit} onChange={e => setNotesEdit(e.target.value)} rows={4}
                    style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit', fontSize: 12 }} />
                ) : (
                  <div style={{ padding: 10, background: 'var(--bg-card)', borderRadius: 8, fontSize: 13, color: 'var(--text)', lineHeight: 1.5, border: '1px solid var(--border)', minHeight: 40 }}>
                    {contact.notes || <span style={{ color: 'var(--text-secondary)', opacity: .5 }}>Sin notas</span>}
                  </div>
                )}
              </div>

              {/* ACTIVITY timeline */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={S.sectionLabel}>Actividad</span>
                  <button onClick={() => setShowActivityForm(!showActivityForm)}
                    style={{ padding: '4px 10px', background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={12} /> Añadir
                  </button>
                </div>
                {showActivityForm && (
                  <form onSubmit={handleAddActivity} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      {ACTIVITY_TYPES.map(at => (
                        <button key={at.key} type="button" onClick={() => setNewActivity(p => ({ ...p, type: at.key }))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            background: newActivity.type === at.key ? 'var(--orange)' : 'transparent',
                            color: newActivity.type === at.key ? '#000' : 'var(--text-secondary)',
                          }}>
                          <at.icon size={12} /> {at.label}
                        </button>
                      ))}
                    </div>
                    <textarea value={newActivity.description} onChange={e => setNewActivity(p => ({ ...p, description: e.target.value }))}
                      placeholder="Descripción..." rows={2}
                      style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit', fontSize: 12, marginBottom: 6 }} />
                    {['meeting', 'call'].includes(newActivity.type) && (
                      <input type="datetime-local" value={newActivity.scheduledAt || ''} onChange={e => setNewActivity(p => ({ ...p, scheduledAt: e.target.value }))}
                        style={{ ...S.input, fontSize: 12, marginBottom: 6, colorScheme: 'dark' }} />
                    )}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowActivityForm(false)} style={{ ...S.btnGhost, fontSize: 11 }}>Cancelar</button>
                      <button type="submit" style={{ padding: '5px 12px', background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Guardar</button>
                    </div>
                  </form>
                )}
                {activitiesLoading ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 12 }}>Cargando...</div>
                ) : activities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 12, opacity: .5 }}>Sin actividades</div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: 20 }}>
                    <div style={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 1, background: 'var(--border)' }} />
                    {activities.map((act, idx) => {
                      const at = ACTIVITY_TYPES.find(a => a.key === act.type) || ACTIVITY_TYPES[3]
                      return (
                        <div key={act.id || idx} style={{ position: 'relative', marginBottom: 12, paddingBottom: 12, borderBottom: idx < activities.length - 1 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
                          <div style={{ position: 'absolute', left: -17, top: 3, width: 12, height: 12, borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--orange)' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <at.icon size={12} style={{ color: 'var(--orange)' }} />
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{at.label}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{fmtDateTime(act.created_at)}</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{act.description}</div>
                            </div>
                            <button onClick={() => { if (confirm('¿Eliminar?')) { deleteCrmActivity(act.id); refreshActivities() } }}
                              style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', opacity: .4 }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '.4'}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* FILES TAB */}
          {tab === 'files' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={S.sectionLabel}>Archivos</span>
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '6px 12px', background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Upload size={13} /> Subir
                </button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
              {(!files || files.length === 0) ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', opacity: .5, fontSize: 13 }}>
                  <Paperclip size={24} style={{ marginBottom: 8, opacity: .3 }} /><br />
                  Sin archivos adjuntos
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {files.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <Paperclip size={14} style={{ color: 'var(--orange)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{f.type} {f.size ? `- ${(f.size / 1024).toFixed(1)}KB` : ''}</div>
                      </div>
                      <button onClick={() => { if (confirm('¿Eliminar archivo?')) { deleteCrmFile(f.id); refreshFiles() } }}
                        style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  )
}

// ─── Custom Field Input ─────────────────────────────────────────────────────────
function CustomFieldInput({ field, value, onChange }) {
  if (field.type === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--orange)' }} />
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{field.name}</span>
      </label>
    )
  }
  return (
    <div>
      <label style={S.label}>{field.name}</label>
      {field.type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={S.input}>
          <option value="">—</option>
          {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text'}
          value={value} onChange={e => onChange(e.target.value)}
          style={{ ...S.input, ...(field.type === 'date' ? { colorScheme: 'dark' } : {}) }} />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// PIPELINE EDITOR MODAL (multi-pipeline)
// ═════════════════════════════════════════════════════════════════════════════════
function PipelineEditorModal({ pipelines, activePipeline, onClose, onSavePipeline, onDeletePipeline }) {
  const [selectedId, setSelectedId] = useState(activePipeline?.id || null)
  const selected = pipelines.find(p => p.id === selectedId)
  const [name, setName] = useState(selected?.name || '')
  const [stages, setStages] = useState(() => (selected?.stages || DEFAULT_STATUSES).map((s, i) => ({ ...s, position: i })))
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (selected) { setName(selected.name); setStages((selected.stages || DEFAULT_STATUSES).map((s, i) => ({ ...s, position: i }))) }
  }, [selectedId])

  const updateStage = (idx, field, value) => setStages(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  const moveStage = (idx, dir) => {
    const n = [...stages]; const j = idx + dir
    if (j < 0 || j >= n.length) return
    ;[n[idx], n[j]] = [n[j], n[idx]]; setStages(n)
  }
  const addStage = () => setStages(prev => [...prev, { key: `stage_${Date.now()}`, label: 'Nueva Etapa', color: '#6B7280' }])
  const removeStage = (idx) => { if (stages.length > 2) setStages(prev => prev.filter((_, i) => i !== idx)) }

  const handleSave = () => {
    if (creating) {
      onSavePipeline(null, { name: name || 'Nuevo Pipeline', stages })
      setCreating(false)
    } else if (selected) {
      onSavePipeline(selected.id, { name, stages })
    }
  }

  const startNew = () => {
    setCreating(true); setSelectedId(null)
    setName('Nuevo Pipeline')
    setStages(DEFAULT_STATUSES.map((s, i) => ({ ...s, position: i })))
  }

  return (
    <>
      <div onClick={onClose} style={S.overlay} />
      <div style={{ ...S.modal, width: 620 }}>
        <div style={S.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={16} style={{ color: 'var(--orange)' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Pipelines</span>
          </div>
          <button onClick={onClose} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Pipeline list */}
          <div style={{ width: 160, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '8px 0' }}>
            {pipelines.map(p => (
              <div key={p.id} onClick={() => { setSelectedId(p.id); setCreating(false) }}
                style={{
                  padding: '8px 14px', fontSize: 12, cursor: 'pointer',
                  background: p.id === selectedId && !creating ? 'rgba(255,107,0,.1)' : 'transparent',
                  color: p.id === selectedId && !creating ? 'var(--orange)' : 'var(--text)',
                  fontWeight: p.id === selectedId && !creating ? 700 : 400, borderLeft: p.id === selectedId && !creating ? '3px solid var(--orange)' : '3px solid transparent',
                }}>
                {p.name}
              </div>
            ))}
            <button onClick={startNew}
              style={{ width: 'calc(100% - 16px)', margin: '8px 8px', padding: '6px', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11 }}>
              <Plus size={12} /> Nuevo
            </button>
          </div>
          {/* Editor */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} style={S.input} />
            </div>
            {stages.map((stage, idx) => (
              <div key={stage.key + idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <button onClick={() => moveStage(idx, -1)} disabled={idx === 0}
                    style={{ padding: 0, background: 'transparent', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--border)' : 'var(--text-secondary)', lineHeight: 1 }}>
                    <ArrowUp size={11} />
                  </button>
                  <button onClick={() => moveStage(idx, 1)} disabled={idx === stages.length - 1}
                    style={{ padding: 0, background: 'transparent', border: 'none', cursor: idx === stages.length - 1 ? 'default' : 'pointer', color: idx === stages.length - 1 ? 'var(--border)' : 'var(--text-secondary)', lineHeight: 1 }}>
                    <ArrowDown size={11} />
                  </button>
                </div>
                <input type="color" value={stage.color} onChange={e => updateStage(idx, 'color', e.target.value)}
                  style={{ width: 26, height: 26, padding: 0, border: '2px solid var(--border)', borderRadius: 5, cursor: 'pointer', background: 'transparent' }} />
                <input value={stage.label} onChange={e => updateStage(idx, 'label', e.target.value)}
                  style={{ flex: 1, padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontSize: 12, outline: 'none' }} />
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{stage.key}</span>
                <button onClick={() => removeStage(idx)} disabled={stages.length <= 2}
                  style={{ padding: 3, background: 'transparent', border: 'none', cursor: stages.length <= 2 ? 'default' : 'pointer', color: stages.length <= 2 ? 'var(--border)' : '#EF4444' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button onClick={addStage}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 14px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11, width: '100%', justifyContent: 'center' }}>
              <Plus size={13} /> Añadir etapa
            </button>
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {selected && !creating && (
            <button onClick={() => onDeletePipeline(selected.id)}
              style={{ padding: '8px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, cursor: 'pointer', color: '#EF4444', fontSize: 12 }}>
              Eliminar Pipeline
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ ...S.btnGhost, padding: '8px 18px', fontSize: 13 }}>Cancelar</button>
            <button onClick={handleSave} className="btn-action" style={{ padding: '8px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// CUSTOM FIELDS MODAL
// ═════════════════════════════════════════════════════════════════════════════════
function CustomFieldsModal({ fields, onClose, onAdd, onUpdate, onDelete, refresh }) {
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'text', options: '', position: 0 })

  const startCreate = () => { setForm({ name: '', type: 'text', options: '', position: fields.length }); setCreating(true); setEditingId(null) }
  const startEdit = (f) => { setForm({ name: f.name, type: f.type, options: (f.options || []).join(', '), position: f.position || 0 }); setEditingId(f.id); setCreating(false) }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const payload = {
      name: form.name, field_key: generateFieldKey(form.name), type: form.type, position: form.position,
      options: form.type === 'select' ? form.options.split(',').map(o => o.trim()).filter(Boolean) : [],
    }
    if (editingId) await onUpdate(editingId, payload)
    else await onAdd(payload)
    refresh(); setCreating(false); setEditingId(null); setForm({ name: '', type: 'text', options: '', position: 0 })
  }

  const moveField = async (field, direction) => {
    const sorted = [...fields].sort((a, b) => (a.position || 0) - (b.position || 0))
    const idx = sorted.findIndex(f => f.id === field.id); const j = idx + direction
    if (j < 0 || j >= sorted.length) return
    await onUpdate(field.id, { position: sorted[j].position || j })
    await onUpdate(sorted[j].id, { position: field.position || idx })
    refresh()
  }

  const sortedFields = [...fields].sort((a, b) => (a.position || 0) - (b.position || 0))

  return (
    <>
      <div onClick={onClose} style={S.overlay} />
      <div style={{ ...S.modal, width: 520 }}>
        <div style={S.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} style={{ color: 'var(--orange)' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Campos Personalizados</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={startCreate} style={{ padding: '5px 12px', background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={13} /> Añadir
            </button>
            <button onClick={onClose} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
          {sortedFields.length === 0 && !creating && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No hay campos personalizados.</div>
          )}
          {sortedFields.map((f, idx) => {
            const Icon = FIELD_TYPE_ICONS[f.type] || FileText
            const isE = editingId === f.id
            return (
              <div key={f.id} style={{ padding: '10px 12px', marginBottom: 6, background: isE ? 'rgba(255,107,0,.05)' : 'var(--bg)', border: `1px solid ${isE ? 'var(--orange)' : 'var(--border)'}`, borderRadius: 8 }}>
                {!isE ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button onClick={() => moveField(f, -1)} disabled={idx === 0} style={{ padding: 0, background: 'transparent', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--border)' : 'var(--text-secondary)', fontSize: 10, lineHeight: 1 }}>&#9650;</button>
                      <button onClick={() => moveField(f, 1)} disabled={idx === sortedFields.length - 1} style={{ padding: 0, background: 'transparent', border: 'none', cursor: idx === sortedFields.length - 1 ? 'default' : 'pointer', color: idx === sortedFields.length - 1 ? 'var(--border)' : 'var(--text-secondary)', fontSize: 10, lineHeight: 1 }}>&#9660;</button>
                    </div>
                    <Icon size={14} style={{ color: 'var(--orange)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {f.type}{f.field_key && <span style={{ fontFamily: 'monospace', marginLeft: 6, opacity: 0.6 }}>({f.field_key})</span>}
                      </div>
                    </div>
                    <button onClick={() => startEdit(f)} style={{ ...S.btnGhost, padding: '4px 8px', fontSize: 11 }}><Edit3 size={12} /></button>
                    <button onClick={() => { if (confirm('¿Eliminar?')) { onDelete(f.id); refresh() } }}
                      style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(239,68,68,.3)', borderRadius: 5, cursor: 'pointer', color: '#EF4444', fontSize: 11 }}><Trash2 size={12} /></button>
                  </div>
                ) : (
                  <FieldForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setEditingId(null)} isEdit />
                )}
              </div>
            )
          })}
          {creating && (
            <div style={{ padding: 12, marginTop: 8, background: 'rgba(255,107,0,.05)', border: '1px solid var(--orange)', borderRadius: 8 }}>
              <FieldForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setCreating(false)} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function FieldForm({ form, setForm, onSave, onCancel, isEdit }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>Nombre</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: LinkedIn" style={S.inputSm} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>Tipo</label>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={S.inputSm}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {form.name && <div style={{ marginBottom: 8, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>field_key: <span style={{ color: 'var(--orange)' }}>{generateFieldKey(form.name)}</span></div>}
      {form.type === 'select' && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>Opciones (coma)</label>
          <input value={form.options} onChange={e => setForm(p => ({ ...p, options: e.target.value }))} placeholder="A, B, C" style={S.inputSm} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ ...S.btnGhost, fontSize: 11 }}>Cancelar</button>
        <button onClick={onSave} style={{ padding: '5px 12px', background: 'var(--orange)', color: '#000', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{isEdit ? 'Actualizar' : 'Crear'}</button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// NEW CONTACT MODAL
// ═════════════════════════════════════════════════════════════════════════════════
function NewContactModal({ customFields, team, statuses, onClose, onSave }) {
  const STATUSES = statuses || DEFAULT_STATUSES
  const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }

  return (
    <>
      <div onClick={onClose} style={S.overlay} />
      <div style={{ ...S.modal, width: 600 }}>
        <div style={S.modalHeader}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Nuevo Contacto</span>
          <button onClick={onClose} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
        </div>
        <form onSubmit={onSave} style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { name: 'name', label: 'Nombre *', required: true, placeholder: 'Nombre completo' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'email@ejemplo.com' },
              { name: 'phone', label: 'Teléfono', placeholder: '+34 600 000 000' },
              { name: 'company', label: 'Empresa', placeholder: 'Nombre de empresa' },
            ].map(f => (
              <div key={f.name}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>{f.label}</label>
                <input name={f.name} type={f.type || 'text'} required={f.required} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Estado</label>
              <select name="status" style={inputStyle}>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Valor</label>
              <input name="dealValue" type="number" placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Asignado a</label>
              <select name="assigned_to" style={inputStyle}>
                <option value="">—</option>{team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Fuente</label>
              <select name="source" style={inputStyle}>
                <option value="">—</option>{SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {[
              { name: 'address', label: 'Dirección', placeholder: 'Dirección' },
              { name: 'whatsapp', label: 'WhatsApp', placeholder: '+34...' },
              { name: 'zoom_link', label: 'Zoom', placeholder: 'https://zoom.us/...' },
              { name: 'website', label: 'Website', placeholder: 'https://...' },
              { name: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...' },
            ].map(f => (
              <div key={f.name}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>{f.label}</label>
                <input name={f.name} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Tags</label>
            <input name="tags" placeholder="vip, seguimiento" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Notas</label>
            <textarea name="notes" rows={3} placeholder="Notas..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{ ...S.btnGhost, padding: '9px 20px', fontSize: 13 }}>Cancelar</button>
            <button type="submit" className="btn-action" style={{ padding: '9px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> Guardar</button>
          </div>
        </form>
      </div>
    </>
  )
}
