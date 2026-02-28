import { useState } from 'react'
import { getReports, saveReports, deleteReport } from '../utils/data'
import ImportModal from '../components/ImportModal'

export default function ReportsTable() {
  const [reports, setReports] = useState(() => getReports())
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [filter, setFilter] = useState('all') // all, setter, closer
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)

  const handleImport = (rows) => {
    const current = getReports()
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const newReports = rows.map(r => ({ ...r, id: generateId() }))
    saveReports([...current, ...newReports])
    setReports(getReports())
  }

  const startEdit = (r) => { setEditingId(r.id); setEditData({ ...r }) }
  const cancelEdit = () => { setEditingId(null); setEditData({}) }

  const saveEdit = () => {
    const updated = reports.map(r => r.id === editingId ? { ...r, ...editData } : r)
    saveReports(updated)
    setReports(updated)
    setEditingId(null)
  }

  const handleDelete = (id) => {
    if (confirm('¿Eliminar este reporte?')) {
      const updated = deleteReport(id)
      setReports(updated)
    }
  }

  const filtered = reports.filter(r => {
    if (filter !== 'all' && r.role !== filter) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.date.includes(search)) return false
    return true
  })

  return (
    <div className="table-page">
      <div className="table-toolbar">
        <input type="text" placeholder="Buscar por nombre o fecha..." value={search} onChange={e => setSearch(e.target.value)} className="table-search" />
        <div className="table-filters">
          <button className={`filter-btn ${filter === 'all' ? 'filter-btn--active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
          <button className={`filter-btn ${filter === 'setter' ? 'filter-btn--active' : ''}`} onClick={() => setFilter('setter')}>Setters</button>
          <button className={`filter-btn ${filter === 'closer' ? 'filter-btn--active' : ''}`} onClick={() => setFilter('closer')}>Closers</button>
        </div>
        <span className="table-count">{filtered.length} reportes</span>
        <button className="btn-import" onClick={() => setShowImport(true)}>Importar CSV/Excel</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Rol</th>
              <th>Nombre</th>
              {filter !== 'closer' && <>
                <th>Conversaciones</th>
                <th>Follow Ups</th>
                <th>Ofertas</th>
                <th>Agendas</th>
              </>}
              {filter !== 'setter' && <>
                <th>Agendadas</th>
                <th>Realizadas</th>
                <th>Ofertas</th>
                <th>Depósitos</th>
                <th>Cierres</th>
              </>}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className={editingId === r.id ? 'row-editing' : ''}>
                {editingId === r.id ? (
                  <>
                    <td><input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} /></td>
                    <td><span className={`badge badge--${editData.role}`}>{editData.role}</span></td>
                    <td><input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /></td>
                    {/* Setter columns */}
                    {filter !== 'closer' && (
                      editData.role === 'setter' ? (
                        <>
                          <td><input type="number" value={editData.conversationsOpened} onChange={e => setEditData({...editData, conversationsOpened: +e.target.value})} /></td>
                          <td><input type="number" value={editData.followUps} onChange={e => setEditData({...editData, followUps: +e.target.value})} /></td>
                          <td><input type="number" value={editData.offersLaunched} onChange={e => setEditData({...editData, offersLaunched: +e.target.value})} /></td>
                          <td><input type="number" value={editData.appointmentsBooked} onChange={e => setEditData({...editData, appointmentsBooked: +e.target.value})} /></td>
                        </>
                      ) : (
                        <td colSpan={4} className="cell-muted">—</td>
                      )
                    )}
                    {/* Closer columns */}
                    {filter !== 'setter' && (
                      editData.role === 'closer' ? (
                        <>
                          <td><input type="number" value={editData.scheduledCalls} onChange={e => setEditData({...editData, scheduledCalls: +e.target.value})} /></td>
                          <td><input type="number" value={editData.callsMade} onChange={e => setEditData({...editData, callsMade: +e.target.value})} /></td>
                          <td><input type="number" value={editData.offersLaunched} onChange={e => setEditData({...editData, offersLaunched: +e.target.value})} /></td>
                          <td><input type="number" value={editData.deposits} onChange={e => setEditData({...editData, deposits: +e.target.value})} /></td>
                          <td><input type="number" value={editData.closes} onChange={e => setEditData({...editData, closes: +e.target.value})} /></td>
                        </>
                      ) : (
                        <td colSpan={5} className="cell-muted">—</td>
                      )
                    )}
                    <td className="actions-cell">
                      <button className="btn-sm btn-sm--save" onClick={saveEdit}>✓</button>
                      <button className="btn-sm btn-sm--cancel" onClick={cancelEdit}>✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{r.date}</td>
                    <td><span className={`badge badge--${r.role}`}>{r.role === 'setter' ? 'Setter' : 'Closer'}</span></td>
                    <td className="cell-bold">{r.name}</td>
                    {/* Setter columns */}
                    {filter !== 'closer' && (
                      r.role === 'setter' ? (
                        <>
                          <td>{r.conversationsOpened}</td>
                          <td>{r.followUps}</td>
                          <td>{r.offersLaunched}</td>
                          <td>{r.appointmentsBooked}</td>
                        </>
                      ) : (
                        <td colSpan={4} className="cell-muted">—</td>
                      )
                    )}
                    {/* Closer columns */}
                    {filter !== 'setter' && (
                      r.role === 'closer' ? (
                        <>
                          <td>{r.scheduledCalls}</td>
                          <td>{r.callsMade}</td>
                          <td>{r.offersLaunched}</td>
                          <td>{r.deposits}</td>
                          <td>{r.closes}</td>
                        </>
                      ) : (
                        <td colSpan={5} className="cell-muted">—</td>
                      )
                    )}
                    <td className="actions-cell">
                      <button className="btn-sm btn-sm--edit" onClick={() => startEdit(r)}>✎</button>
                      <button className="btn-sm btn-sm--delete" onClick={() => handleDelete(r.id)}>🗑</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showImport && <ImportModal type="reports" onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  )
}
