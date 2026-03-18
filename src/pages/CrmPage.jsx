import { useState, useMemo, useRef, useCallback } from 'react'
import { useClientData } from '../hooks/useClientData'
import { useAsync } from '../hooks/useAsync'
import {
  Search, Plus, Settings, X, ChevronDown, GripVertical,
  Phone, Mail, Building2, User, Tag, Calendar, DollarSign,
  Clock, MessageSquare, Video, FileText, Trash2, Edit3,
  Filter, LayoutGrid, List, Eye, Save, ChevronRight, Globe, Hash, CheckSquare, Link, MailIcon
} from 'lucide-react'

// ─── Pipeline Statuses ─────────────────────────────────────────────────────────
const STATUSES = [
  { key: 'lead',        label: 'Lead',         color: '#6B7280' },
  { key: 'contacted',   label: 'Contactado',   color: '#3B82F6' },
  { key: 'qualified',   label: 'Cualificado',  color: '#8B5CF6' },
  { key: 'proposal',    label: 'Propuesta',    color: '#F59E0B' },
  { key: 'negotiation', label: 'Negociación',  color: '#FF6B00' },
  { key: 'won',         label: 'Ganado',       color: '#22C55E' },
  { key: 'lost',        label: 'Perdido',      color: '#EF4444' },
]

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.key, s]))

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

const emptyContact = {
  name: '', email: '', phone: '', company: '', status: 'lead',
  dealValue: '', assigned_to: '', source: '', tags: '', notes: '',
  customFields: {},
}

// ─── Utility ────────────────────────────────────────────────────────────────────
const fmt = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ═════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════════════
export default function CrmPage() {
  const {
    getCrmContacts, addCrmContact, updateCrmContact, deleteCrmContact,
    getCrmActivities, addCrmActivity, deleteCrmActivity,
    getCrmCustomFields, addCrmCustomField, updateCrmCustomField, deleteCrmCustomField,
    getCrmSmartViews, addCrmSmartView, updateCrmSmartView, deleteCrmSmartView,
    getCrmPipelines, addCrmPipeline, updateCrmPipeline,
    getTeam,
  } = useClientData()

  const [contacts, contactsLoading, refreshContacts] = useAsync(getCrmContacts, [])
  const [customFields, , refreshFields] = useAsync(getCrmCustomFields, [])
  const [smartViews, , refreshViews] = useAsync(getCrmSmartViews, [])
  const [team] = useAsync(getTeam, [])

  // ─── UI State ───────────────────────────────────────────────────────────────
  const [view, setView] = useState('kanban')
  const [search, setSearch] = useState('')
  const [activeViewId, setActiveViewId] = useState(null)
  const [showNewContact, setShowNewContact] = useState(false)
  const [showCustomFields, setShowCustomFields] = useState(false)
  const [showSmartViews, setShowSmartViews] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [contactForm, setContactForm] = useState({ ...emptyContact })
  const [editingContact, setEditingContact] = useState(false)
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [draggedId, setDraggedId] = useState(null)

  // ─── Smart View filtering ──────────────────────────────────────────────────
  const activeView = smartViews.find(v => v.id === activeViewId)
  const activeFilters = activeView?.filters || {}

  const filteredContacts = useMemo(() => {
    let list = [...contacts]
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
    // Smart view filters
    if (activeFilters.status) list = list.filter(c => c.status === activeFilters.status)
    if (activeFilters.assigned_to) list = list.filter(c => c.assigned_to === activeFilters.assigned_to)
    if (activeFilters.source) list = list.filter(c => c.source === activeFilters.source)
    if (activeFilters.tags) {
      const tag = activeFilters.tags.toLowerCase()
      list = list.filter(c => (c.tags || '').toLowerCase().includes(tag))
    }
    return list
  }, [contacts, search, activeFilters])

  // ─── Sorted list for table view ────────────────────────────────────────────
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

  // ─── Kanban groups ─────────────────────────────────────────────────────────
  const kanbanColumns = useMemo(() => {
    return STATUSES.map(s => {
      const items = filteredContacts.filter(c => c.status === s.key)
      const total = items.reduce((sum, c) => sum + (Number(c.dealValue) || 0), 0)
      return { ...s, items, total }
    })
  }, [filteredContacts])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const openContact = (contact) => {
    setSelectedContact(contact)
    setEditingContact(false)
  }

  const closeContact = () => {
    setSelectedContact(null)
    setEditingContact(false)
  }

  const handleNewContact = () => {
    setContactForm({ ...emptyContact, customFields: {} })
    setShowNewContact(true)
  }

  const handleSaveNewContact = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...contactForm, dealValue: Number(contactForm.dealValue) || 0 }
      await addCrmContact(payload)
      refreshContacts()
      setShowNewContact(false)
      setContactForm({ ...emptyContact })
    } catch (err) {
      console.error('Error saving contact:', err)
      alert('Error al guardar contacto.')
    }
  }

  const handleUpdateContact = async (updates) => {
    if (!selectedContact) return
    try {
      await updateCrmContact(selectedContact.id, updates)
      refreshContacts()
      setSelectedContact(prev => ({ ...prev, ...updates }))
    } catch (err) {
      console.error('Error updating contact:', err)
    }
  }

  const handleDeleteContact = async () => {
    if (!selectedContact) return
    if (!confirm('¿Eliminar este contacto?')) return
    try {
      await deleteCrmContact(selectedContact.id)
      refreshContacts()
      closeContact()
    } catch (err) {
      console.error('Error deleting contact:', err)
    }
  }

  const handleStatusChange = async (contactId, newStatus) => {
    try {
      await updateCrmContact(contactId, { status: newStatus })
      refreshContacts()
      if (selectedContact?.id === contactId) {
        setSelectedContact(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.error('Error changing status:', err)
    }
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const onDragStart = (e, contactId) => {
    setDraggedId(contactId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', contactId)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = async (e, statusKey) => {
    e.preventDefault()
    const id = draggedId || e.dataTransfer.getData('text/plain')
    if (!id) return
    setDraggedId(null)
    await handleStatusChange(id, statusKey)
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (contactsLoading) {
    return (
      <div className="dashboard">
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Cargando CRM...</div>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="dashboard" style={{ position: 'relative', overflow: 'hidden' }}>

      {/* ─── Top Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        marginBottom: 24, padding: '0 0 16px', borderBottom: '1px solid var(--border)',
      }}>
        {/* View toggles */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setView('kanban')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: view === 'kanban' ? 'var(--orange)' : 'var(--bg-card)',
              color: view === 'kanban' ? '#000' : 'var(--text-secondary)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'all .2s',
            }}
          >
            <LayoutGrid size={15} /> Kanban
          </button>
          <button
            onClick={() => setView('list')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: view === 'list' ? 'var(--orange)' : 'var(--bg-card)',
              color: view === 'list' ? '#000' : 'var(--text-secondary)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              borderLeft: '1px solid var(--border)', transition: 'all .2s',
            }}
          >
            <List size={15} /> Lista
          </button>
        </div>

        {/* Smart Views */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSmartViews(!showSmartViews)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: activeViewId ? 'rgba(255,107,0,.15)' : 'var(--bg-card)',
              color: activeViewId ? 'var(--orange)' : 'var(--text-secondary)',
              border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
            }}
          >
            <Eye size={15} />
            {activeView ? activeView.name : 'Smart Views'}
            <ChevronDown size={14} />
          </button>
        </div>

        {activeViewId && (
          <button
            onClick={() => setActiveViewId(null)}
            style={{
              padding: '4px 10px', fontSize: 11, background: 'rgba(239,68,68,.15)',
              color: '#EF4444', border: 'none', borderRadius: 6, cursor: 'pointer',
            }}
          >
            Limpiar filtro
          </button>
        )}

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, flex: '1 1 200px', maxWidth: 320,
        }}>
          <Search size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar contactos..."
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13, width: '100%',
            }}
          />
          {search && (
            <X size={14} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setSearch('')} />
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowCustomFields(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            }}
          >
            <Settings size={15} />
          </button>
          <button className="btn-action" onClick={handleNewContact} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Nuevo Contacto
          </button>
        </div>
      </div>

      {/* ─── Pipeline Summary ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4,
      }}>
        {STATUSES.map(s => {
          const count = contacts.filter(c => c.status === s.key).length
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 20, fontSize: 12, whiteSpace: 'nowrap',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: s.color,
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* ─── Kanban View ──────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16,
          minHeight: 'calc(100vh - 280px)',
        }}>
          {kanbanColumns.map(col => (
            <div
              key={col.key}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, col.key)}
              style={{
                minWidth: 280, maxWidth: 320, flex: '0 0 280px',
                display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,.02)', borderRadius: 12,
                border: '1px solid var(--border)',
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: `2px solid ${col.color}`,
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', background: col.color,
                  flexShrink: 0,
                }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', flex: 1 }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: 11, background: `${col.color}22`, color: col.color,
                  padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                }}>
                  {col.items.length}
                </span>
              </div>
              {col.total > 0 && (
                <div style={{
                  padding: '6px 16px', fontSize: 11, color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  Total: {fmt(col.total)}
                </div>
              )}

              {/* Cards */}
              <div style={{ padding: 8, flex: 1, overflowY: 'auto' }}>
                {col.items.length === 0 && (
                  <div style={{
                    padding: 24, textAlign: 'center', color: 'var(--text-secondary)',
                    fontSize: 12, opacity: 0.5,
                  }}>
                    Sin contactos
                  </div>
                )}
                {col.items.map(c => (
                  <KanbanCard
                    key={c.id}
                    contact={c}
                    onDragStart={onDragStart}
                    onClick={() => openContact(c)}
                    isDragging={draggedId === c.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── List View ────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="data-table">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {[
                    { key: 'name', label: 'Nombre' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Teléfono' },
                    { key: 'company', label: 'Empresa' },
                    { key: 'status', label: 'Estado' },
                    { key: 'dealValue', label: 'Valor' },
                    { key: 'assigned_to', label: 'Asignado' },
                    { key: 'source', label: 'Fuente' },
                    { key: 'last_activity', label: 'Últ. Actividad' },
                    { key: 'created_at', label: 'Creado' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    >
                      {col.label}
                      {sortCol === col.key && (
                        <span style={{ marginLeft: 4, fontSize: 10 }}>
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedContacts.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                      No hay contactos
                    </td>
                  </tr>
                )}
                {sortedContacts.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => openContact(c)}
                    style={{ cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.phone || '—'}</td>
                    <td>{c.company || '—'}</td>
                    <td>
                      <select
                        value={c.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleStatusChange(c.id, e.target.value)}
                        style={{
                          background: `${STATUS_MAP[c.status]?.color || '#666'}22`,
                          color: STATUS_MAP[c.status]?.color || '#999',
                          border: `1px solid ${STATUS_MAP[c.status]?.color || '#666'}44`,
                          borderRadius: 6, padding: '3px 8px', fontSize: 11,
                          fontWeight: 600, cursor: 'pointer', outline: 'none',
                        }}
                      >
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--orange)' }}>{fmt(c.dealValue)}</td>
                    <td style={{ fontSize: 12 }}>{c.assigned_to || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.source || '—'}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(c.last_activity)}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Contact Detail Sidebar ───────────────────────────────────── */}
      {selectedContact && (
        <ContactSidebar
          contact={selectedContact}
          customFields={customFields}
          team={team}
          onClose={closeContact}
          onUpdate={handleUpdateContact}
          onDelete={handleDeleteContact}
          onStatusChange={handleStatusChange}
          editing={editingContact}
          setEditing={setEditingContact}
          getCrmActivities={getCrmActivities}
          addCrmActivity={addCrmActivity}
          deleteCrmActivity={deleteCrmActivity}
        />
      )}

      {/* ─── Smart Views Panel ────────────────────────────────────────── */}
      {showSmartViews && (
        <SmartViewsPanel
          views={smartViews}
          activeViewId={activeViewId}
          onSelect={(id) => { setActiveViewId(id); setShowSmartViews(false) }}
          onClose={() => setShowSmartViews(false)}
          onAdd={addCrmSmartView}
          onUpdate={updateCrmSmartView}
          onDelete={deleteCrmSmartView}
          refresh={refreshViews}
          team={team}
        />
      )}

      {/* ─── Custom Fields Modal ──────────────────────────────────────── */}
      {showCustomFields && (
        <CustomFieldsModal
          fields={customFields}
          onClose={() => setShowCustomFields(false)}
          onAdd={addCrmCustomField}
          onUpdate={updateCrmCustomField}
          onDelete={deleteCrmCustomField}
          refresh={refreshFields}
        />
      )}

      {/* ─── New Contact Modal ────────────────────────────────────────── */}
      {showNewContact && (
        <NewContactModal
          form={contactForm}
          setForm={setContactForm}
          customFields={customFields}
          team={team}
          onClose={() => setShowNewContact(false)}
          onSave={handleSaveNewContact}
        />
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
    <div
      draggable
      onDragStart={e => onDragStart(e, c.id)}
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: 14, marginBottom: 8,
        cursor: 'grab', transition: 'all .2s',
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(.95)' : 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,.15)',
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'var(--orange)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,107,0,.12)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.15)'
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
        {c.name || 'Sin nombre'}
      </div>
      {c.company && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
          <Building2 size={11} /> {c.company}
        </div>
      )}
      {(Number(c.dealValue) > 0) && (
        <div style={{
          fontSize: 14, fontWeight: 700, color: 'var(--orange)', marginBottom: 6,
        }}>
          {fmt(c.dealValue)}
        </div>
      )}
      {c.assigned_to && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
          <User size={11} /> {c.assigned_to}
        </div>
      )}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tags.slice(0, 3).map(t => (
            <span key={t} style={{
              padding: '2px 7px', borderRadius: 4, fontSize: 10,
              background: 'rgba(255,107,0,.12)', color: 'var(--orange)', fontWeight: 600,
            }}>
              {t}
            </span>
          ))}
          {tags.length > 3 && (
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>+{tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// CONTACT SIDEBAR
// ═════════════════════════════════════════════════════════════════════════════════
function ContactSidebar({
  contact, customFields, team, onClose, onUpdate, onDelete,
  onStatusChange, editing, setEditing,
  getCrmActivities, addCrmActivity, deleteCrmActivity,
}) {
  const [activities, activitiesLoading, refreshActivities] = useAsync(
    useCallback(() => getCrmActivities(contact.id), [contact.id]),
    []
  )
  const [editForm, setEditForm] = useState({})
  const [newActivity, setNewActivity] = useState({ type: 'note', description: '' })
  const [showActivityForm, setShowActivityForm] = useState(false)

  const startEditing = () => {
    setEditForm({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      dealValue: contact.dealValue || '',
      assigned_to: contact.assigned_to || '',
      source: contact.source || '',
      tags: contact.tags || '',
      notes: contact.notes || '',
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
    try {
      await addCrmActivity({
        contact_id: contact.id,
        type: newActivity.type,
        description: newActivity.description,
      })
      refreshActivities()
      setNewActivity({ type: 'note', description: '' })
      setShowActivityForm(false)
    } catch (err) {
      console.error('Error adding activity:', err)
    }
  }

  const handleDeleteActivity = async (id) => {
    if (!confirm('¿Eliminar esta actividad?')) return
    await deleteCrmActivity(id)
    refreshActivities()
  }

  const s = STATUS_MAP[contact.status] || STATUSES[0]

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          zIndex: 999,
        }}
      />
      {/* Sidebar */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '100vw', background: 'var(--bg)',
        borderLeft: '1px solid var(--border)', zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .25s ease-out',
        boxShadow: '-8px 0 30px rgba(0,0,0,.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 800,
            fontSize: 16, background: `${s.color}22`, color: s.color, flexShrink: 0,
          }}>
            {(contact.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contact.name || 'Sin nombre'}
            </div>
            {contact.company && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{contact.company}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editing && (
              <button onClick={startEditing} style={{
                padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
              }}>
                <Edit3 size={13} /> Editar
              </button>
            )}
            <button onClick={onDelete} style={{
              padding: '6px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 6, cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
            }}>
              <Trash2 size={13} />
            </button>
            <button onClick={onClose} style={{
              padding: '6px', background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text-secondary)',
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Estado
            </label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {STATUSES.map(st => (
                <button
                  key={st.key}
                  onClick={() => onStatusChange(contact.id, st.key)}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: contact.status === st.key ? `${st.color}33` : 'var(--bg-card)',
                    color: contact.status === st.key ? st.color : 'var(--text-secondary)',
                    border: contact.status === st.key ? `1px solid ${st.color}` : '1px solid var(--border)',
                    transition: 'all .15s',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info Section */}
          {!editing ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Información
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <InfoRow icon={<Mail size={13} />} label="Email" value={contact.email} />
                <InfoRow icon={<Phone size={13} />} label="Teléfono" value={contact.phone} />
                <InfoRow icon={<Building2 size={13} />} label="Empresa" value={contact.company} />
                <InfoRow icon={<DollarSign size={13} />} label="Valor" value={fmt(contact.dealValue)} />
                <InfoRow icon={<User size={13} />} label="Asignado" value={contact.assigned_to} />
                <InfoRow icon={<Globe size={13} />} label="Fuente" value={contact.source} />
                <InfoRow icon={<Calendar size={13} />} label="Creado" value={fmtDate(contact.created_at)} />
                {contact.tags && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0' }}>
                    <Tag size={13} style={{ color: 'var(--text-secondary)', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {contact.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11,
                          background: 'rgba(255,107,0,.12)', color: 'var(--orange)', fontWeight: 600,
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Fields */}
              {customFields.length > 0 && contact.customFields && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, margin: '16px 0 10px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Campos Personalizados
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {customFields.map(f => {
                      const val = contact.customFields?.[f.id || f.name]
                      if (val === undefined || val === '') return null
                      return (
                        <div key={f.id || f.name} style={{
                          display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
                            {f.type === 'checkbox' ? (val ? 'Sí' : 'No') : String(val)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {contact.notes && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Notas
                  </div>
                  <div style={{
                    padding: 12, background: 'var(--bg-card)', borderRadius: 8,
                    fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
                    border: '1px solid var(--border)',
                  }}>
                    {contact.notes}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Edit Form */
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Editar Información
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <SidebarField label="Nombre" value={editForm.name} onChange={v => setEditForm(p => ({ ...p, name: v }))} />
                <SidebarField label="Email" value={editForm.email} onChange={v => setEditForm(p => ({ ...p, email: v }))} type="email" />
                <SidebarField label="Teléfono" value={editForm.phone} onChange={v => setEditForm(p => ({ ...p, phone: v }))} />
                <SidebarField label="Empresa" value={editForm.company} onChange={v => setEditForm(p => ({ ...p, company: v }))} />
                <SidebarField label="Valor del Trato" value={editForm.dealValue} onChange={v => setEditForm(p => ({ ...p, dealValue: v }))} type="number" />
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Asignado a</label>
                  <select
                    value={editForm.assigned_to}
                    onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--bg-card)',
                      border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                      fontSize: 13, outline: 'none',
                    }}
                  >
                    <option value="">— Sin asignar —</option>
                    {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Fuente</label>
                  <select
                    value={editForm.source}
                    onChange={e => setEditForm(p => ({ ...p, source: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--bg-card)',
                      border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                      fontSize: 13, outline: 'none',
                    }}
                  >
                    <option value="">— Seleccionar —</option>
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <SidebarField label="Tags (separados por coma)" value={editForm.tags} onChange={v => setEditForm(p => ({ ...p, tags: v }))} />
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Notas</label>
                  <textarea
                    value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--bg-card)',
                      border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                      fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Custom field editing */}
                {customFields.map(f => (
                  <CustomFieldInput
                    key={f.id || f.name}
                    field={f}
                    value={editForm.customFields?.[f.id || f.name] || ''}
                    onChange={v => setEditForm(p => ({
                      ...p,
                      customFields: { ...p.customFields, [f.id || f.name]: v },
                    }))}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => setEditing(false)} style={{
                  flex: 1, padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13,
                }}>
                  Cancelar
                </button>
                <button onClick={saveEdit} className="btn-action" style={{ flex: 1, padding: '8px', fontSize: 13 }}>
                  <Save size={13} style={{ marginRight: 4 }} /> Guardar
                </button>
              </div>
            </div>
          )}

          {/* ─── Activity Timeline ──────────────────────────────────────── */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Actividad
              </span>
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                  background: 'var(--orange)', color: '#000', border: 'none',
                  borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                }}
              >
                <Plus size={12} /> Añadir
              </button>
            </div>

            {showActivityForm && (
              <form onSubmit={handleAddActivity} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 12, marginBottom: 12,
              }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {ACTIVITY_TYPES.map(at => (
                    <button
                      key={at.key}
                      type="button"
                      onClick={() => setNewActivity(p => ({ ...p, type: at.key }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                        borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11,
                        fontWeight: 600,
                        background: newActivity.type === at.key ? 'var(--orange)' : 'transparent',
                        color: newActivity.type === at.key ? '#000' : 'var(--text-secondary)',
                      }}
                    >
                      <at.icon size={12} /> {at.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={newActivity.description}
                  onChange={e => setNewActivity(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción de la actividad..."
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 10px', background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                    fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                    marginBottom: 8, boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowActivityForm(false)} style={{
                    padding: '5px 12px', background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 5, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11,
                  }}>
                    Cancelar
                  </button>
                  <button type="submit" style={{
                    padding: '5px 12px', background: 'var(--orange)', color: '#000',
                    border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}>
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {/* Timeline */}
            {activitiesLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 12 }}>
                Cargando actividades...
              </div>
            ) : activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 12, opacity: .5 }}>
                Sin actividades registradas
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                {/* Timeline line */}
                <div style={{
                  position: 'absolute', left: 6, top: 4, bottom: 4, width: 1,
                  background: 'var(--border)',
                }} />
                {activities.map((act, idx) => {
                  const at = ACTIVITY_TYPES.find(a => a.key === act.type) || ACTIVITY_TYPES[3]
                  const Icon = at.icon
                  return (
                    <div key={act.id || idx} style={{
                      position: 'relative', marginBottom: 12, paddingBottom: 12,
                      borderBottom: idx < activities.length - 1 ? '1px solid rgba(255,255,255,.03)' : 'none',
                    }}>
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute', left: -17, top: 3, width: 12, height: 12,
                        borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--orange)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--orange)' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <Icon size={12} style={{ color: 'var(--orange)' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>
                              {at.label}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                              {fmtDateTime(act.created_at)}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {act.description}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          style={{
                            padding: 4, background: 'transparent', border: 'none',
                            cursor: 'pointer', color: 'var(--text-secondary)', opacity: .4,
                            flexShrink: 0,
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '.4'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

// ─── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,.04)',
    }}>
      <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}

// ─── Sidebar Field ─────────────────────────────────────────────────────────────
function SidebarField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
          fontSize: 13, outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Custom Field Input ────────────────────────────────────────────────────────
function CustomFieldInput({ field, value, onChange }) {
  const baseStyle = {
    width: '100%', padding: '8px 10px', background: 'var(--bg-card)',
    border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  let input
  switch (field.type) {
    case 'checkbox':
      input = (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            style={{ accentColor: 'var(--orange)' }}
          />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{field.name}</span>
        </label>
      )
      break
    case 'select':
      input = (
        <select value={value} onChange={e => onChange(e.target.value)} style={baseStyle}>
          <option value="">— Seleccionar —</option>
          {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
      break
    case 'date':
      input = <input type="date" value={value} onChange={e => onChange(e.target.value)} style={{ ...baseStyle, colorScheme: 'dark' }} />
      break
    case 'number':
    case 'currency':
      input = <input type="number" value={value} onChange={e => onChange(e.target.value)} style={baseStyle} />
      break
    default:
      input = <input type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text'} value={value} onChange={e => onChange(e.target.value)} style={baseStyle} />
  }

  return (
    <div>
      {field.type !== 'checkbox' && (
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
          {field.name}
        </label>
      )}
      {input}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// SMART VIEWS PANEL
// ═════════════════════════════════════════════════════════════════════════════════
function SmartViewsPanel({ views, activeViewId, onSelect, onClose, onAdd, onUpdate, onDelete, refresh, team }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', filters: {} })

  const startCreate = () => {
    setForm({ name: '', filters: {} })
    setCreating(true)
    setEditing(null)
  }

  const startEdit = (v) => {
    setForm({ name: v.name, filters: { ...(v.filters || {}) } })
    setEditing(v.id)
    setCreating(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    try {
      if (editing) {
        await onUpdate(editing, form)
      } else {
        await onAdd(form)
      }
      refresh()
      setCreating(false)
      setEditing(null)
      setForm({ name: '', filters: {} })
    } catch (err) {
      console.error('Error saving smart view:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta vista?')) return
    await onDelete(id)
    refresh()
    if (activeViewId === id) onSelect(null)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
      <div style={{
        position: 'absolute', top: 70, left: 200, width: 380, maxHeight: 500,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.4)', zIndex: 999,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Smart Views</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={startCreate} style={{
              padding: '4px 10px', background: 'var(--orange)', color: '#000',
              border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Plus size={12} /> Nueva
            </button>
            <button onClick={onClose} style={{
              padding: '4px', background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text-secondary)',
            }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* All contacts option */}
          <div
            onClick={() => onSelect(null)}
            style={{
              padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              background: !activeViewId ? 'rgba(255,107,0,.08)' : 'transparent',
              borderBottom: '1px solid var(--border)',
              transition: 'background .15s',
            }}
            onMouseEnter={e => !activeViewId || (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
            onMouseLeave={e => e.currentTarget.style.background = !activeViewId ? 'rgba(255,107,0,.08)' : 'transparent'}
          >
            <Filter size={13} style={{ color: activeViewId ? 'var(--text-secondary)' : 'var(--orange)' }} />
            <span style={{ fontSize: 13, color: !activeViewId ? 'var(--orange)' : 'var(--text)', fontWeight: !activeViewId ? 700 : 400 }}>
              Todos los contactos
            </span>
          </div>

          {views.map(v => (
            <div key={v.id} style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
              background: activeViewId === v.id ? 'rgba(255,107,0,.08)' : 'transparent',
              borderBottom: '1px solid var(--border)', transition: 'background .15s',
            }}>
              <div
                onClick={() => onSelect(v.id)}
                style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Eye size={13} style={{ color: activeViewId === v.id ? 'var(--orange)' : 'var(--text-secondary)' }} />
                <span style={{ fontSize: 13, color: activeViewId === v.id ? 'var(--orange)' : 'var(--text)', fontWeight: activeViewId === v.id ? 700 : 400 }}>
                  {v.name}
                </span>
              </div>
              <button onClick={() => startEdit(v)} style={{
                padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              }}>
                <Edit3 size={12} />
              </button>
              <button onClick={() => handleDelete(v.id)} style={{
                padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444',
              }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {views.length === 0 && !creating && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              No hay vistas guardadas
            </div>
          )}

          {/* Create / Edit Form */}
          {(creating || editing) && (
            <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,.02)' }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Nombre de la vista
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Leads Calientes"
                  style={{
                    width: '100%', padding: '7px 10px', background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                    fontSize: 12, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Estado</label>
                  <select
                    value={form.filters.status || ''}
                    onChange={e => setForm(p => ({ ...p, filters: { ...p.filters, status: e.target.value || undefined } }))}
                    style={{
                      width: '100%', padding: '6px 8px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontSize: 11,
                    }}
                  >
                    <option value="">Todos</option>
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Asignado</label>
                  <select
                    value={form.filters.assigned_to || ''}
                    onChange={e => setForm(p => ({ ...p, filters: { ...p.filters, assigned_to: e.target.value || undefined } }))}
                    style={{
                      width: '100%', padding: '6px 8px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontSize: 11,
                    }}
                  >
                    <option value="">Todos</option>
                    {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Fuente</label>
                  <select
                    value={form.filters.source || ''}
                    onChange={e => setForm(p => ({ ...p, filters: { ...p.filters, source: e.target.value || undefined } }))}
                    style={{
                      width: '100%', padding: '6px 8px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontSize: 11,
                    }}
                  >
                    <option value="">Todas</option>
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Tag</label>
                  <input
                    value={form.filters.tags || ''}
                    onChange={e => setForm(p => ({ ...p, filters: { ...p.filters, tags: e.target.value || undefined } }))}
                    placeholder="Filtrar por tag"
                    style={{
                      width: '100%', padding: '6px 8px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontSize: 11,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setCreating(false); setEditing(null) }}
                  style={{
                    padding: '5px 12px', background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 5, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '5px 12px', background: 'var(--orange)', color: '#000',
                    border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}
                >
                  {editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          )}
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

  const startCreate = () => {
    setForm({ name: '', type: 'text', options: '', position: fields.length })
    setCreating(true)
    setEditingId(null)
  }

  const startEdit = (f) => {
    setForm({
      name: f.name, type: f.type,
      options: (f.options || []).join(', '),
      position: f.position || 0,
    })
    setEditingId(f.id)
    setCreating(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const payload = {
      name: form.name,
      type: form.type,
      position: form.position,
      options: form.type === 'select' ? form.options.split(',').map(o => o.trim()).filter(Boolean) : [],
    }
    try {
      if (editingId) {
        await onUpdate(editingId, payload)
      } else {
        await onAdd(payload)
      }
      refresh()
      setCreating(false)
      setEditingId(null)
      setForm({ name: '', type: 'text', options: '', position: 0 })
    } catch (err) {
      console.error('Error saving custom field:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este campo personalizado?')) return
    await onDelete(id)
    refresh()
  }

  const moveField = async (field, direction) => {
    const sorted = [...fields].sort((a, b) => (a.position || 0) - (b.position || 0))
    const idx = sorted.findIndex(f => f.id === field.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    try {
      await onUpdate(field.id, { position: other.position || swapIdx })
      await onUpdate(other.id, { position: field.position || idx })
      refresh()
    } catch (err) {
      console.error('Error reordering:', err)
    }
  }

  const sortedFields = [...fields].sort((a, b) => (a.position || 0) - (b.position || 0))

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 520, maxWidth: '95vw', maxHeight: '80vh', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: '0 12px 48px rgba(0,0,0,.5)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} style={{ color: 'var(--orange)' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Campos Personalizados</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={startCreate} style={{
              padding: '5px 12px', background: 'var(--orange)', color: '#000',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Plus size={13} /> Añadir Campo
            </button>
            <button onClick={onClose} style={{
              padding: 4, background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text-secondary)',
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
          {sortedFields.length === 0 && !creating && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              No hay campos personalizados. Crea uno para empezar.
            </div>
          )}

          {sortedFields.map((f, idx) => {
            const Icon = FIELD_TYPE_ICONS[f.type] || FileText
            const isEditing = editingId === f.id
            return (
              <div key={f.id} style={{
                padding: '10px 12px', marginBottom: 6,
                background: isEditing ? 'rgba(255,107,0,.05)' : 'var(--bg)',
                border: `1px solid ${isEditing ? 'var(--orange)' : 'var(--border)'}`,
                borderRadius: 8, transition: 'all .15s',
              }}>
                {!isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button
                        onClick={() => moveField(f, -1)}
                        disabled={idx === 0}
                        style={{
                          padding: 0, background: 'transparent', border: 'none',
                          cursor: idx === 0 ? 'default' : 'pointer',
                          color: idx === 0 ? 'var(--border)' : 'var(--text-secondary)',
                          fontSize: 10, lineHeight: 1,
                        }}
                      >▲</button>
                      <button
                        onClick={() => moveField(f, 1)}
                        disabled={idx === sortedFields.length - 1}
                        style={{
                          padding: 0, background: 'transparent', border: 'none',
                          cursor: idx === sortedFields.length - 1 ? 'default' : 'pointer',
                          color: idx === sortedFields.length - 1 ? 'var(--border)' : 'var(--text-secondary)',
                          fontSize: 10, lineHeight: 1,
                        }}
                      >▼</button>
                    </div>
                    <Icon size={14} style={{ color: 'var(--orange)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {f.type}
                        {f.type === 'select' && f.options?.length > 0 && ` (${f.options.join(', ')})`}
                      </div>
                    </div>
                    <button onClick={() => startEdit(f)} style={{
                      padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: 5, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11,
                    }}>
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => handleDelete(f.id)} style={{
                      padding: '4px 8px', background: 'transparent', border: '1px solid rgba(239,68,68,.3)',
                      borderRadius: 5, cursor: 'pointer', color: '#EF4444', fontSize: 11,
                    }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <FieldForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setEditingId(null)} isEdit />
                )}
              </div>
            )
          })}

          {creating && (
            <div style={{
              padding: '12px', marginTop: 8,
              background: 'rgba(255,107,0,.05)', border: '1px solid var(--orange)',
              borderRadius: 8,
            }}>
              <FieldForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setCreating(false)} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Field Form (used inside Custom Fields Modal) ──────────────────────────────
function FieldForm({ form, setForm, onSave, onCancel, isEdit }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
            Nombre del campo
          </label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Ej: LinkedIn URL"
            style={{
              width: '100%', padding: '7px 10px', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
              fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
            Tipo
          </label>
          <select
            value={form.type}
            onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            style={{
              width: '100%', padding: '7px 10px', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
              fontSize: 12, outline: 'none',
            }}
          >
            {FIELD_TYPES.map(t => (
              <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {form.type === 'select' && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
            Opciones (separadas por coma)
          </label>
          <input
            value={form.options}
            onChange={e => setForm(p => ({ ...p, options: e.target.value }))}
            placeholder="Opción 1, Opción 2, Opción 3"
            style={{
              width: '100%', padding: '7px 10px', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
              fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          padding: '5px 12px', background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 5, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11,
        }}>
          Cancelar
        </button>
        <button onClick={onSave} style={{
          padding: '5px 12px', background: 'var(--orange)', color: '#000',
          border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
        }}>
          {isEdit ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════════
// NEW CONTACT MODAL
// ═════════════════════════════════════════════════════════════════════════════════
function NewContactModal({ form, setForm, customFields, team, onClose, onSave }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, maxWidth: '95vw', maxHeight: '85vh', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: '0 12px 48px rgba(0,0,0,.5)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Nuevo Contacto</span>
          <button onClick={onClose} style={{
            padding: 4, background: 'transparent', border: 'none',
            cursor: 'pointer', color: 'var(--text-secondary)',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSave} style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Nombre *
              </label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
                placeholder="Nombre completo"
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="email@ejemplo.com"
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Teléfono
              </label>
              <input
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+34 600 000 000"
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Empresa
              </label>
              <input
                value={form.company}
                onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                placeholder="Nombre de empresa"
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Estado
              </label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                  fontSize: 13, outline: 'none',
                }}
              >
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Valor del Trato
              </label>
              <input
                type="number"
                value={form.dealValue}
                onChange={e => setForm(p => ({ ...p, dealValue: e.target.value }))}
                placeholder="0"
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Asignado a
              </label>
              <select
                value={form.assigned_to}
                onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                  fontSize: 13, outline: 'none',
                }}
              >
                <option value="">— Sin asignar —</option>
                {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Fuente
              </label>
              <select
                value={form.source}
                onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                  fontSize: 13, outline: 'none',
                }}
              >
                <option value="">— Seleccionar —</option>
                {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Tags (separados por coma)
            </label>
            <input
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="vip, seguimiento, interesado"
              style={{
                width: '100%', padding: '9px 12px', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notas adicionales..."
              rows={3}
              style={{
                width: '100%', padding: '9px 12px', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)',
                fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Dynamic custom fields */}
          {customFields.length > 0 && (
            <>
              <div style={{
                fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10,
                paddingTop: 8, borderTop: '1px solid var(--border)',
              }}>
                Campos Personalizados
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {customFields.map(f => (
                  <CustomFieldInput
                    key={f.id || f.name}
                    field={f}
                    value={form.customFields?.[f.id || f.name] || ''}
                    onChange={v => setForm(p => ({
                      ...p,
                      customFields: { ...p.customFields, [f.id || f.name]: v },
                    }))}
                  />
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn-action btn-action--secondary" style={{ padding: '9px 20px', fontSize: 13 }}>
              Cancelar
            </button>
            <button type="submit" className="btn-action" style={{ padding: '9px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> Guardar Contacto
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
