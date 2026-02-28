import { useState } from 'react'
import { getSalesWithNetCash, addSales, updateSale, deleteSale, getPaymentFees, getTeam } from '../utils/data'
import { useAsync } from '../hooks/useAsync'
import ImportModal from '../components/ImportModal'

const PAYMENT_TYPES = ['Pago único', '2 cuotas', '3 cuotas', '4 cuotas', '5 cuotas', '6 cuotas']

function getInstallmentOptions(paymentType) {
  if (paymentType === 'Pago único') return ['Pago único']
  const match = paymentType.match(/^(\d+)/)
  if (!match) return ['Pago único']
  const n = parseInt(match[1])
  return Array.from({ length: n }, (_, i) => `${i + 1}/${n}`)
}

const SOURCE_LABELS = { manual: 'Manual', close_crm: 'CRM', import: 'Import' }

export default function SalesTable() {
  const [sales, salesLoading, refreshSales, setSales] = useAsync(getSalesWithNetCash, [])
  const [paymentFees] = useAsync(getPaymentFees, [])
  const [team] = useAsync(getTeam, [])
  const closers = team.filter(m => m.role === 'closer' && m.active)
  const settersList = team.filter(m => m.role === 'setter' && m.active)
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)

  const handleImport = async (rows) => {
    await addSales(rows)
    refreshSales()
  }

  const startEdit = (sale) => {
    setEditingId(sale.id)
    setEditData({ ...sale })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const saveEdit = async () => {
    const { netCash, ...rawData } = editData
    await updateSale(editingId, rawData)
    refreshSales()
    setEditingId(null)
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar esta venta?')) {
      await deleteSale(id)
      refreshSales()
    }
  }

  const handleEditPaymentType = (val) => {
    if (val === 'Pago único') {
      setEditData({ ...editData, paymentType: val, installmentNumber: 'Pago único' })
    } else {
      const opts = getInstallmentOptions(val)
      setEditData({ ...editData, paymentType: val, installmentNumber: opts[0] })
    }
  }

  const filtered = sales.filter(s => {
    const q = search.toLowerCase()
    return s.clientName.toLowerCase().includes(q) ||
      s.clientEmail.toLowerCase().includes(q) ||
      s.closer.toLowerCase().includes(q) ||
      (s.setter || '').toLowerCase().includes(q) ||
      s.product.toLowerCase().includes(q) ||
      (s.pais || '').toLowerCase().includes(q) ||
      (s.utmSource || '').toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q)
  })

  const fmt = (n) => `€${Number(n).toLocaleString('es-ES')}`
  const MAIN_COL_COUNT = 17

  if (salesLoading) return <div className="table-page"><div style={{textAlign:'center',padding:60,color:'#999'}}>Cargando ventas...</div></div>

  return (
    <div className="table-page">
      <div className="table-toolbar">
        <input
          type="text"
          placeholder="Buscar por nombre, email, closer, setter, producto, país, UTM..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="table-search"
        />
        <span className="table-count">{filtered.length} ventas</span>
        <button className="btn-import" onClick={() => setShowImport(true)}>Importar CSV/Excel</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cuota</th>
              <th>Método</th>
              <th>Revenue</th>
              <th>Cash</th>
              <th>Cash Neto</th>
              <th>Closer</th>
              <th>Setter</th>
              <th>País</th>
              <th>UTM Source</th>
              <th>Estado</th>
              <th>Fuente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sale => (
              editingId === sale.id ? (
                <tr key={sale.id} className="row-editing">
                  <td></td>
                  <td><input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} /></td>
                  <td><input value={editData.clientName} onChange={e => setEditData({...editData, clientName: e.target.value})} /></td>
                  <td>
                    <select value={editData.product} onChange={e => setEditData({...editData, product: e.target.value})}>
                      <option>FBA Academy Pro</option>
                      <option>Mentoring 1:1</option>
                      <option>China Bootcamp</option>
                    </select>
                  </td>
                  <td>
                    <select value={editData.paymentType} onChange={e => handleEditPaymentType(e.target.value)}>
                      {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={editData.installmentNumber} onChange={e => setEditData({...editData, installmentNumber: e.target.value})}>
                      {getInstallmentOptions(editData.paymentType).map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={editData.paymentMethod} onChange={e => setEditData({...editData, paymentMethod: e.target.value})}>
                      {paymentFees.map(f => <option key={f.id} value={f.method}>{f.method}</option>)}
                    </select>
                  </td>
                  <td><input type="number" value={editData.revenue} onChange={e => setEditData({...editData, revenue: +e.target.value})} style={{width:80}} /></td>
                  <td><input type="number" value={editData.cashCollected} onChange={e => setEditData({...editData, cashCollected: +e.target.value})} style={{width:80}} /></td>
                  <td className="cell-muted">—</td>
                  <td>
                    <select value={editData.closer} onChange={e => setEditData({...editData, closer: e.target.value})}>
                      <option value="">—</option>
                      {closers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={editData.setter || ''} onChange={e => setEditData({...editData, setter: e.target.value})}>
                      <option value="">—</option>
                      {settersList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </td>
                  <td><input value={editData.pais || ''} onChange={e => setEditData({...editData, pais: e.target.value})} style={{width:80}} /></td>
                  <td><input value={editData.utmSource || ''} onChange={e => setEditData({...editData, utmSource: e.target.value})} style={{width:80}} /></td>
                  <td>
                    <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                      <option>Completada</option>
                      <option>Pendiente</option>
                      <option>Reembolso</option>
                    </select>
                  </td>
                  <td className="cell-muted">—</td>
                  <td className="actions-cell">
                    <button className="btn-sm btn-sm--save" onClick={saveEdit}>✓</button>
                    <button className="btn-sm btn-sm--cancel" onClick={cancelEdit}>✕</button>
                  </td>
                </tr>
              ) : (
                <>
                  <tr key={sale.id}>
                    <td>
                      <button
                        className="btn-sm"
                        style={{ width: 24, height: 24, fontSize: '0.7rem' }}
                        onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                        title="Ver detalle del lead"
                      >
                        {expandedId === sale.id ? '▾' : '▸'}
                      </button>
                    </td>
                    <td>{sale.date}</td>
                    <td>
                      <div className="cell-bold">{sale.clientName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sale.clientEmail}</div>
                    </td>
                    <td><span className="badge badge--product">{sale.product}</span></td>
                    <td>{sale.paymentType}</td>
                    <td>
                      {sale.installmentNumber !== 'Pago único' ? (
                        <span className="badge badge--pendiente">{sale.installmentNumber}</span>
                      ) : '—'}
                    </td>
                    <td>{sale.paymentMethod}</td>
                    <td className="cell-money">{fmt(sale.revenue)}</td>
                    <td className="cell-money">{fmt(sale.cashCollected)}</td>
                    <td className="cell-money" style={{ color: 'var(--success)' }}>{fmt(sale.netCash)}</td>
                    <td>{sale.closer}</td>
                    <td>{sale.setter || '—'}</td>
                    <td>{sale.pais || '—'}</td>
                    <td>{sale.utmSource ? <span className="badge badge--setter" style={{ fontSize: '0.65rem' }}>{sale.utmSource}</span> : '—'}</td>
                    <td><span className={`badge badge--${sale.status.toLowerCase()}`}>{sale.status}</span></td>
                    <td>
                      <span className={`badge badge--${sale.source === 'close_crm' ? 'setter' : 'product'}`} style={{ fontSize: '0.65rem' }}>
                        {SOURCE_LABELS[sale.source] || 'Manual'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="btn-sm btn-sm--edit" onClick={() => startEdit(sale)}>✎</button>
                      <button className="btn-sm btn-sm--delete" onClick={() => handleDelete(sale.id)}>🗑</button>
                    </td>
                  </tr>
                  {expandedId === sale.id && (
                    <tr key={`${sale.id}-detail`} className="detail-row">
                      <td colSpan={MAIN_COL_COUNT} style={{ padding: 0 }}>
                        <div className="lead-detail-panel">
                          <div className="lead-detail-grid">
                            <div className="lead-detail-section">
                              <h4>Contacto</h4>
                              <div className="lead-field"><span className="lead-field-label">Email</span><span>{sale.clientEmail || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Teléfono</span><span>{sale.clientPhone || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Instagram</span><span>{sale.instagram || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">País</span><span>{sale.pais || '—'}</span></div>
                            </div>
                            <div className="lead-detail-section">
                              <h4>Perfil del Lead</h4>
                              <div className="lead-field"><span className="lead-field-label">Situación</span><span>{sale.situacionActual || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Capital</span><span>{sale.capitalDisponible || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Exp Amazon</span><span>{sale.expAmazon || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Decisor</span><span>{sale.decisorConfirmado || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Producto interés</span><span>{sale.productoInteres || '—'}</span></div>
                            </div>
                            <div className="lead-detail-section">
                              <h4>Atribución</h4>
                              <div className="lead-field"><span className="lead-field-label">UTM Source</span><span>{sale.utmSource || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">UTM Medium</span><span>{sale.utmMedium || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">UTM Campaign</span><span>{sale.utmCampaign || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">UTM Content</span><span>{sale.utmContent || '—'}</span></div>
                            </div>
                            <div className="lead-detail-section">
                              <h4>Equipo & Notas</h4>
                              <div className="lead-field"><span className="lead-field-label">Triager</span><span>{sale.triager || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Gestor</span><span>{sale.gestorAsignado || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Fecha Llamada</span><span>{sale.fechaLlamada || '—'}</span></div>
                              <div className="lead-field"><span className="lead-field-label">Notas</span><span>{sale.notes || '—'}</span></div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            ))}
          </tbody>
        </table>
      </div>
      {showImport && <ImportModal type="sales" onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  )
}
