import { useState, useMemo, useEffect } from 'react'
import { useClientData } from '../hooks/useClientData'
import { useAsync } from '../hooks/useAsync'

const STATUS_LABELS = { active: 'Activo', completed: 'Completado', defaulted: 'Impago' }
const STATUS_COLORS = { active: '#3b82f6', completed: '#22c55e', defaulted: '#ef4444' }

function NewPlanModal({ team, onClose, onSave }) {
  const closers = team.filter(m => m.role === 'closer' && m.active !== false)
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '', product: '',
    closer: closers[0]?.name || '',
    totalInstallments: 3, totalAmount: '', startDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const amountPerInstallment = form.totalAmount && form.totalInstallments
    ? Math.round(parseFloat(form.totalAmount) / form.totalInstallments * 100) / 100
    : 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.clientName || !form.totalAmount || !form.totalInstallments) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        totalAmount: parseFloat(form.totalAmount),
        totalInstallments: parseInt(form.totalInstallments),
        amountPerInstallment,
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>Nuevo Plan de Pagos a Plazos</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Cliente *</label>
              <input style={inputStyle} value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} required />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Email</label>
              <input type="email" style={inputStyle} value={form.clientEmail} onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Teléfono</label>
              <input style={inputStyle} value={form.clientPhone} onChange={e => setForm(p => ({ ...p, clientPhone: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Producto</label>
              <input style={inputStyle} value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Closer asignado</label>
              <select style={inputStyle} value={form.closer} onChange={e => setForm(p => ({ ...p, closer: e.target.value }))}>
                <option value="">—</option>
                {closers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Fecha inicio</label>
              <input type="date" style={inputStyle} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Importe total *</label>
              <input type="number" step="0.01" min="0" style={inputStyle} value={form.totalAmount} onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))} required />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Num. cuotas *</label>
              <select style={inputStyle} value={form.totalInstallments} onChange={e => setForm(p => ({ ...p, totalInstallments: e.target.value }))}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n} cuotas</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Cuota mensual</label>
              <div style={{ ...inputStyle, background: 'var(--bg-card)', fontWeight: 600, color: 'var(--orange)' }}>
                {amountPerInstallment > 0 ? `${amountPerInstallment.toFixed(2)}€` : '—'}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Notas</label>
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          <button type="submit" className="btn-action" disabled={saving} style={{ marginTop: 4 }}>
            {saving ? 'Creando...' : 'Crear Plan de Pagos'}
          </button>
        </form>
      </div>
    </div>
  )
}

function PlanCard({ plan, payments, onMarkPaid, onUpdatePlan, expanded, onToggle, user }) {
  const paidCount = payments.filter(p => p.paid).length
  const paidAmount = payments.filter(p => p.paid).reduce((s, p) => s + (p.amount || 0), 0)
  const remaining = plan.totalAmount - paidAmount
  const pct = plan.totalInstallments > 0 ? Math.round(paidCount / plan.totalInstallments * 100) : 0
  const barColor = plan.status === 'defaulted' ? '#ef4444' : pct >= 100 ? '#22c55e' : pct >= 50 ? '#3b82f6' : '#f97316'

  return (
    <div className={`installment-card ${expanded ? 'installment-card--expanded' : ''}`}>
      <div className="installment-card__header" onClick={onToggle}>
        <div className="installment-card__avatar">{plan.clientName.charAt(0).toUpperCase()}</div>
        <div className="installment-card__info">
          <h4 className="installment-card__name">{plan.clientName}</h4>
          <span className="installment-card__product">{plan.product || '—'} · {plan.closer || '—'}</span>
        </div>
        <div className="installment-card__progress-wrap">
          <div className="installment-card__progress-bar">
            <div className="installment-card__progress-fill" style={{ width: `${pct}%`, background: barColor }} />
          </div>
          <span className="installment-card__progress-text" style={{ color: barColor }}>
            {paidCount}/{plan.totalInstallments} cuotas
          </span>
        </div>
        <div className="installment-card__amount">
          <span className="installment-card__amount-value">{plan.totalAmount?.toFixed(0)}€</span>
          <span className="installment-card__amount-label">
            Pendiente: <strong style={{ color: remaining > 0 ? '#f97316' : '#22c55e' }}>{remaining.toFixed(0)}€</strong>
          </span>
        </div>
        <span className="store-status-badge" style={{ background: `${STATUS_COLORS[plan.status]}20`, color: STATUS_COLORS[plan.status], borderColor: `${STATUS_COLORS[plan.status]}40` }}>
          {STATUS_LABELS[plan.status] || plan.status}
        </span>
        <span className="installment-card__toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="installment-card__body">
          {plan.clientEmail && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Email: {plan.clientEmail} {plan.clientPhone ? `· Tel: ${plan.clientPhone}` : ''}</p>}
          {plan.startDate && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Inicio: {plan.startDate}</p>}

          <div className="installment-card__payments">
            {payments.map(p => (
              <div key={p.id} className={`installment-payment ${p.paid ? 'installment-payment--paid' : ''}`}>
                <span className="installment-payment__number">Cuota {p.installmentNumber}</span>
                <span className="installment-payment__amount">{(p.amount || 0).toFixed(2)}€</span>
                {p.paid ? (
                  <span className="installment-payment__status installment-payment__status--paid">
                    Pagado {p.paidDate ? new Date(p.paidDate).toLocaleDateString('es-ES') : ''}
                    {p.markedBy ? ` · ${p.markedBy}` : ''}
                  </span>
                ) : (
                  <button
                    className="installment-payment__btn"
                    onClick={() => onMarkPaid(p.id, user)}
                  >
                    Marcar como pagado
                  </button>
                )}
              </div>
            ))}
          </div>

          {plan.notes && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 8, fontStyle: 'italic' }}>{plan.notes}</p>}

          <div className="installment-card__actions">
            {plan.status === 'active' && paidCount === plan.totalInstallments && (
              <button className="btn-sm btn-sm--success" onClick={() => onUpdatePlan(plan.id, { status: 'completed' })}>
                Marcar como completado
              </button>
            )}
            {plan.status === 'active' && (
              <button className="btn-sm btn-sm--danger" onClick={() => onUpdatePlan(plan.id, { status: 'defaulted' })}>
                Marcar como impago
              </button>
            )}
            {plan.status !== 'active' && (
              <button className="btn-sm" onClick={() => onUpdatePlan(plan.id, { status: 'active' })}>
                Reactivar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InstallmentPaymentsPage({ user }) {
  const {
    getInstallmentPlans, createInstallmentPlanWithPayments, updateInstallmentPlan,
    getInstallmentPayments, updateInstallmentPayment, getTeam,
  } = useClientData()

  const [plans, plansLoading, refreshPlans] = useAsync(getInstallmentPlans, [])
  const [team] = useAsync(getTeam, [])
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [paymentsMap, setPaymentsMap] = useState({})
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Load payments for expanded plan
  useEffect(() => {
    if (!expandedId || paymentsMap[expandedId]) return
    getInstallmentPayments(expandedId).then(payments => {
      setPaymentsMap(prev => ({ ...prev, [expandedId]: payments }))
    }).catch(console.error)
  }, [expandedId])

  const filteredPlans = useMemo(() => {
    let result = plans
    if (filter !== 'all') result = result.filter(p => p.status === filter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.clientName?.toLowerCase().includes(q) ||
        p.product?.toLowerCase().includes(q) ||
        p.closer?.toLowerCase().includes(q)
      )
    }
    return result
  }, [plans, filter, search])

  // Summary stats
  const activePlans = plans.filter(p => p.status === 'active')
  const totalPending = activePlans.reduce((s, p) => {
    const paid = (paymentsMap[p.id] || []).filter(pm => pm.paid).reduce((acc, pm) => acc + (pm.amount || 0), 0)
    return s + (p.totalAmount || 0) - paid
  }, 0)
  const defaultedCount = plans.filter(p => p.status === 'defaulted').length

  async function handleMarkPaid(paymentId, userName) {
    await updateInstallmentPayment(paymentId, {
      paid: true,
      paidDate: new Date().toISOString(),
      markedBy: userName || 'Sistema',
    })
    // Refresh payments for this plan
    if (expandedId) {
      const refreshed = await getInstallmentPayments(expandedId)
      setPaymentsMap(prev => ({ ...prev, [expandedId]: refreshed }))
      // Auto-complete if all paid
      const plan = plans.find(p => p.id === expandedId)
      if (plan && refreshed.every(p => p.paid)) {
        await updateInstallmentPlan(plan.id, { status: 'completed' })
        refreshPlans()
      }
    }
  }

  async function handleUpdatePlan(planId, updates) {
    await updateInstallmentPlan(planId, updates)
    refreshPlans()
  }

  async function handleCreate(planData) {
    await createInstallmentPlanWithPayments(planData)
    refreshPlans()
  }

  const filters = [
    { key: 'all', label: 'Todos', count: plans.length },
    { key: 'active', label: 'Activos', count: activePlans.length },
    { key: 'completed', label: 'Completados', count: plans.filter(p => p.status === 'completed').length },
    { key: 'defaulted', label: 'Impagos', count: defaultedCount },
  ]

  return (
    <div className="installments-page">
      {/* Summary */}
      <div className="installments-summary">
        <div className="installments-summary__stat">
          <span className="installments-summary__value">{plansLoading ? '...' : activePlans.length}</span>
          <span className="installments-summary__label">Planes activos</span>
        </div>
        <div className="installments-summary__stat">
          <span className="installments-summary__value" style={{ color: '#f97316' }}>{plansLoading ? '...' : `${totalPending.toFixed(0)}€`}</span>
          <span className="installments-summary__label">Pendiente cobro</span>
        </div>
        <div className="installments-summary__stat">
          <span className="installments-summary__value" style={{ color: defaultedCount > 0 ? '#ef4444' : '#22c55e' }}>{plansLoading ? '...' : defaultedCount}</span>
          <span className="installments-summary__label">Impagos</span>
        </div>
        <div className="installments-summary__stat">
          <span className="installments-summary__value">{plansLoading ? '...' : plans.length}</span>
          <span className="installments-summary__label">Total planes</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="installments-toolbar">
        <div className="installments-filters">
          {filters.map(f => (
            <button
              key={f.key}
              className={`installments-filter ${filter === f.key ? 'installments-filter--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="installments-toolbar__right">
          <input
            type="text"
            placeholder="Buscar cliente, producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="installments-search"
          />
          <button className="btn-action" onClick={() => setShowCreate(true)}>+ Nuevo Plan</button>
        </div>
      </div>

      {/* Plans list */}
      {plansLoading ? (
        <div className="stores-loading">Cargando planes de pago...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="stores-empty">
          {plans.length === 0 ? 'No hay planes de pago. Crea uno o registra una venta con pago a plazos.' : 'Sin resultados para el filtro actual.'}
        </div>
      ) : (
        <div className="installments-list">
          {filteredPlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              payments={paymentsMap[plan.id] || []}
              expanded={expandedId === plan.id}
              onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
              onMarkPaid={handleMarkPaid}
              onUpdatePlan={handleUpdatePlan}
              user={user}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <NewPlanModal
          team={team}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}
