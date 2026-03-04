import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useClientData } from '../../hooks/useClientData'
import { getRoles } from '../../utils/roles'

export default function CeoEquipo() {
  const { getTeam, getCeoTeamNotes, saveCeoTeamNote } = useClientData()
  const [team, loadingTeam] = useAsync(getTeam, [])
  const [notes, loadingNotes, refreshNotes] = useAsync(getCeoTeamNotes, [])
  const [editingNote, setEditingNote] = useState({})
  const [saving, setSaving] = useState({})

  const active = team.filter(m => m.active !== false)
  const inactive = team.filter(m => m.active === false)

  const roleCounts = team.reduce((acc, m) => {
    getRoles(m.role).forEach(r => { acc[r] = (acc[r] || 0) + 1 })
    return acc
  }, {})

  function getNoteForMember(memberId) {
    const found = notes.find(n => n.memberId === memberId || n.member_id === memberId)
    return found ? found.note : ''
  }

  function getEditValue(memberId) {
    if (editingNote[memberId] !== undefined) return editingNote[memberId]
    return getNoteForMember(memberId)
  }

  async function handleSaveNote(memberId) {
    setSaving(prev => ({ ...prev, [memberId]: true }))
    try {
      await saveCeoTeamNote(memberId, editingNote[memberId] || '')
      await refreshNotes()
      setEditingNote(prev => { const n = { ...prev }; delete n[memberId]; return n })
    } catch (e) {
      alert('Error guardando nota: ' + e.message)
    } finally {
      setSaving(prev => ({ ...prev, [memberId]: false }))
    }
  }

  const loading = loadingTeam || loadingNotes

  return (
    <div className="form-page">
      <h2 style={{ margin: '0 0 24px', color: '#fff' }}>👥 Equipo — Vista Ejecutiva</h2>

      <div className="stats-grid stats-grid--5" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-card-icon">👥</div><div className="stat-card-value">{loading ? '...' : team.length}</div><div className="stat-card-label">Total</div></div>
        <div className="stat-card"><div className="stat-card-icon">✅</div><div className="stat-card-value">{loading ? '...' : active.length}</div><div className="stat-card-label">Activos</div></div>
        <div className="stat-card"><div className="stat-card-icon">⏸️</div><div className="stat-card-value">{loading ? '...' : inactive.length}</div><div className="stat-card-label">Inactivos</div></div>
        {Object.entries(roleCounts).map(([role, count]) => (
          <div className="stat-card" key={role}>
            <div className="stat-card-value">{count}</div>
            <div className="stat-card-label">{role.charAt(0).toUpperCase() + role.slice(1)}s</div>
          </div>
        ))}
      </div>

      <div className="ceo-team-grid">
        {team.map(member => (
          <div className="ceo-team-card" key={member.id}>
            <div className="ceo-team-card__header">
              <div>
                <div className="ceo-team-card__name">{member.name}</div>
                <div className="ceo-team-card__email">{member.email}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {getRoles(member.role).map(r => (
                  <span key={r} className={`badge badge--${r}`}>{r}</span>
                ))}
                {member.active === false && <span className="badge badge--reembolso">Inactivo</span>}
              </div>
            </div>
            {member.commissionRate != null && (
              <div className="ceo-team-card__info">Comisión: {member.commissionRate}%</div>
            )}
            <div className="ceo-note-section">
              <label>Nota privada del CEO</label>
              <textarea
                className="ceo-note-textarea"
                value={getEditValue(member.id)}
                onChange={e => setEditingNote(prev => ({ ...prev, [member.id]: e.target.value }))}
                placeholder="Escribe una nota sobre este miembro..."
              />
              {editingNote[member.id] !== undefined && (
                <div className="ceo-note-actions">
                  <button className="ceo-note-save" onClick={() => handleSaveNote(member.id)} disabled={saving[member.id]}>
                    {saving[member.id] ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
