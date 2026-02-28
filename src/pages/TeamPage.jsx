import { useState } from 'react'
import { getTeam, addMember, updateMember, deleteMember } from '../utils/data'
import { useAsync } from '../hooks/useAsync'
import { hasRole, getRoles } from '../utils/roles'

const ROLES = ['director', 'manager', 'closer', 'setter']
const ROLE_LABELS = { director: 'Director', manager: 'Manager', closer: 'Closer', setter: 'Setter' }

const emptyForm = { name: '', email: '', password: '', roles: ['closer'], active: true, commissionRate: 0.10 }

export default function TeamPage() {
  const [team, teamLoading, refreshTeam, setTeam] = useAsync(getTeam, [])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })

  const grouped = ROLES.reduce((acc, role) => {
    acc[role] = team.filter(m => hasRole(m.role, role))
    return acc
  }, {})

  // Track shown IDs to avoid duplicate cards
  const shownIds = new Set()

  const toggleRole = (role) => {
    setForm(prev => {
      const has = prev.roles.includes(role)
      const next = has ? prev.roles.filter(r => r !== role) : [...prev.roles, role]
      return { ...prev, roles: next.length > 0 ? next : prev.roles }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { roles, ...rest } = form
    const payload = { ...rest, role: roles.join(',') }
    if (editingId) {
      if (!payload.password) delete payload.password
      await updateMember(editingId, payload)
    } else {
      await addMember(payload)
    }
    refreshTeam()
    setForm({ ...emptyForm })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (m) => {
    setForm({ name: m.name, email: m.email, password: '', roles: getRoles(m.role), active: m.active, commissionRate: m.commissionRate })
    setEditingId(m.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este miembro?')) {
      await deleteMember(id)
      refreshTeam()
    }
  }

  const cancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  if (teamLoading) return <div className="dashboard"><div style={{textAlign:'center',padding:60,color:'#999'}}>Cargando equipo...</div></div>

  return (
    <div className="dashboard">
      <div className="dashboard-actions" style={{ marginBottom: 24 }}>
        <button className="btn-action" onClick={() => { cancel(); setShowForm(true) }}>+ Añadir Miembro</button>
      </div>

      {showForm && (
        <div className="form-card" style={{ marginBottom: 28 }}>
          <h3 className="form-title">{editingId ? 'Editar Miembro' : 'Nuevo Miembro'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid form-grid--3">
              <div className="form-group">
                <label>Nombre</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingId ? 'Dejar vacío para no cambiar' : 'Contraseña'} required={!editingId} />
              </div>
              <div className="form-group">
                <label>Roles</label>
                <div className="role-checkboxes">
                  {ROLES.map(r => (
                    <label key={r} className="role-checkbox-label">
                      <input type="checkbox" checked={form.roles.includes(r)} onChange={() => toggleRole(r)} />
                      <span className={`role-checkbox-tag badge badge--${r}`}>{ROLE_LABELS[r]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Tasa de Comisión (decimal)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.commissionRate} onChange={e => setForm({...form, commissionRate: +e.target.value})} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={form.active ? 'true' : 'false'} onChange={e => setForm({...form, active: e.target.value === 'true'})}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-action btn-action--secondary" onClick={cancel}>Cancelar</button>
              <button type="submit" className="btn-action">{editingId ? 'Guardar' : 'Añadir'}</button>
            </div>
          </form>
        </div>
      )}

      {ROLES.map(role => (
        grouped[role].length > 0 && (
          <div key={role}>
            <div className="section-label-dash">{ROLE_LABELS[role]}s</div>
            <div className="team-grid">
              {grouped[role].map(m => {
                const alreadyShown = shownIds.has(m.id)
                shownIds.add(m.id)
                return (
                  <div key={m.id} className={`team-card${alreadyShown ? ' team-card--secondary' : ''}`}>
                    <div className="team-card-header">
                      <div className="team-avatar">{m.name.charAt(0)}</div>
                      <div className="team-card-info">
                        <div className="team-card-name">{m.name}</div>
                        <div className="team-card-email">{m.email}</div>
                      </div>
                    </div>
                    <div className="team-card-details">
                      {getRoles(m.role).map(r => (
                        <span key={r} className={`badge badge--${r}`}>{ROLE_LABELS[r]}</span>
                      ))}
                      <span className={`badge ${m.active ? 'badge--completada' : 'badge--reembolso'}`}>{m.active ? 'Activo' : 'Inactivo'}</span>
                      <span className="team-card-rate">{(m.commissionRate * 100).toFixed(0)}% comisión</span>
                    </div>
                    {!alreadyShown && (
                      <div className="team-card-actions">
                        <button className="btn-sm btn-sm--edit" onClick={() => startEdit(m)}>✎</button>
                        <button className="btn-sm btn-sm--delete" onClick={() => handleDelete(m.id)}>🗑</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      ))}
    </div>
  )
}
