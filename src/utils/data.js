import { supabase, toDb, toApp } from './supabase'

// Normalize date strings to YYYY-MM-DD for PostgreSQL
function normalizeDate(val) {
  if (!val || val === '') return new Date().toISOString().split('T')[0]
  const str = String(val).trim()
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  // DD/MM/YYYY or DD-MM-YYYY
  const parts = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (parts) {
    let [, a, b, year] = parts
    let day, month
    if (parseInt(a) > 12) { day = a; month = b }
    else if (parseInt(b) > 12) { month = a; day = b }
    else { day = a; month = b } // Default DD/MM/YYYY
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  // Try native parsing
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  return new Date().toISOString().split('T')[0]
}

// ---- SALES ----
export async function getSales(clientId) {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'sales'))
}

export async function addSale(sale, clientId) {
  const dbSale = toDb(sale, 'sales')
  delete dbSale.id
  dbSale.client_id = clientId
  const { data, error } = await supabase
    .from('sales')
    .insert(dbSale)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'sales')
}

export async function addSales(sales, clientId) {
  const dbSales = sales.map(s => {
    s.date = normalizeDate(s.date)
    const d = toDb(s, 'sales')
    delete d.id
    d.client_id = clientId
    return d
  })
  const { data, error } = await supabase
    .from('sales')
    .insert(dbSales)
    .select()
  if (error) throw error
  return data.map(row => toApp(row, 'sales'))
}

export async function updateSale(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'sales')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('sales').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteSale(id, clientId) {
  const query = supabase.from('sales').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function getSalesWithNetCash(clientId) {
  const { data, error } = await supabase
    .from('sales_with_net_cash')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => {
    const sale = toApp(row, 'sales')
    sale.netCash = Number(row.net_cash) || 0
    return sale
  })
}

// ---- REPORTS ----
export async function getReports(clientId) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'reports'))
}

export async function addReport(report, clientId) {
  const dbReport = toDb(report, 'reports')
  delete dbReport.id
  dbReport.client_id = clientId
  const { data, error } = await supabase
    .from('reports')
    .insert(dbReport)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'reports')
}

export async function addReports(reports, clientId) {
  const dbReports = reports.map(r => {
    r.date = normalizeDate(r.date)
    if (r.role) r.role = r.role.toLowerCase().trim()
    const d = toDb(r, 'reports')
    delete d.id
    d.client_id = clientId
    return d
  })
  const { data, error } = await supabase
    .from('reports')
    .insert(dbReports)
    .select()
  if (error) throw error
  return data.map(row => toApp(row, 'reports'))
}

export async function updateReport(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'reports')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('reports').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteReport(id, clientId) {
  const query = supabase.from('reports').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

// ---- TEAM ----
export async function getTeam(clientId) {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data.map(row => toApp(row, 'team'))
}

export async function addMember(member, clientId) {
  const dbMember = toDb(member, 'team')
  delete dbMember.id
  dbMember.client_id = clientId
  const { data, error } = await supabase
    .from('team')
    .insert(dbMember)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'team')
}

export async function updateMember(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'team')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('team').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteMember(id, clientId) {
  const query = supabase.from('team').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

// ---- COMMISSION PAYMENTS ----
export async function getCommissionPayments(clientId) {
  const { data, error } = await supabase
    .from('commission_payments')
    .select('*')
    .eq('client_id', clientId)
    .order('period_start', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'commission_payments'))
}

export async function upsertCommissionPayment(payment, clientId) {
  // Check if exists for same member + period + role
  const { data: existing } = await supabase
    .from('commission_payments')
    .select('id')
    .eq('client_id', clientId)
    .eq('member_id', payment.memberId)
    .eq('period_start', payment.periodStart)
    .eq('period_end', payment.periodEnd)
    .eq('role', payment.role)
    .maybeSingle()

  const dbPayment = toDb(payment, 'commission_payments')
  if (existing) {
    delete dbPayment.client_id
    const { error } = await supabase
      .from('commission_payments')
      .update(dbPayment)
      .eq('id', existing.id)
    if (error) throw error
  } else {
    dbPayment.client_id = clientId
    const { error } = await supabase
      .from('commission_payments')
      .insert(dbPayment)
    if (error) throw error
  }
}

export async function toggleCommissionPaid(paymentId, paid) {
  const { error } = await supabase
    .from('commission_payments')
    .update({
      status: paid ? 'paid' : 'pending',
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq('id', paymentId)
  if (error) throw error
}

export async function authenticateUser(email, password, clientId) {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .eq('client_id', clientId)
    .eq('email', email)
    .eq('password', password)
    .eq('active', true)
    .maybeSingle()
  if (error || !data) return null
  return toApp(data, 'team')
}

// ---- PROJECTIONS ----
export async function getProjections(clientId) {
  const { data, error } = await supabase
    .from('projections')
    .select('*')
    .eq('client_id', clientId)
    .order('period', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'projections'))
}

export async function addProjection(projection, clientId) {
  const dbProjection = toDb(projection, 'projections')
  delete dbProjection.id
  dbProjection.client_id = clientId
  const { data, error } = await supabase
    .from('projections')
    .insert(dbProjection)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'projections')
}

export async function updateProjection(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'projections')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('projections').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteProjection(id, clientId) {
  const query = supabase.from('projections').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

// ---- PRODUCTS ----
export async function getProducts(clientId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data.map(row => toApp(row, 'products'))
}

export async function addProduct(product, clientId) {
  const dbProduct = toDb(product, 'products')
  delete dbProduct.id
  dbProduct.client_id = clientId
  const { data, error } = await supabase
    .from('products')
    .insert(dbProduct)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'products')
}

export async function updateProduct(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'products')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('products').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteProduct(id, clientId) {
  const query = supabase.from('products').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

// ---- PAYMENT FEES ----
export async function getPaymentFees(clientId) {
  const { data, error } = await supabase
    .from('payment_fees')
    .select('*')
    .eq('client_id', clientId)
    .order('method')
  if (error) throw error
  return data.map(row => toApp(row, 'payment_fees'))
}

export async function addPaymentFee(fee, clientId) {
  const dbFee = toDb(fee, 'payment_fees')
  delete dbFee.id
  dbFee.client_id = clientId
  const { data, error } = await supabase
    .from('payment_fees')
    .insert(dbFee)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'payment_fees')
}

export async function updatePaymentFee(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'payment_fees')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('payment_fees').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deletePaymentFee(id, clientId) {
  const query = supabase.from('payment_fees').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

// ---- N8N CONFIG ----
export async function getN8nConfig(clientId) {
  const { data, error } = await supabase
    .from('n8n_config')
    .select('*')
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle()
  if (error || !data) return { id: null, webhookUrl: '', apiKey: '', enabled: false, lastSync: null }
  return toApp(data, 'n8n_config')
}

export async function saveN8nConfig(config, clientId) {
  const dbConfig = toDb(config, 'n8n_config')
  if (config.id) {
    delete dbConfig.id
    delete dbConfig.client_id
    const query = supabase.from('n8n_config').update(dbConfig).eq('id', config.id)
    if (clientId) query.eq('client_id', clientId)
    const { error } = await query
    if (error) throw error
  } else {
    dbConfig.client_id = clientId
    const { error } = await supabase
      .from('n8n_config')
      .insert(dbConfig)
    if (error) throw error
  }
}

// ---- CEO MEETINGS ----
export async function getCeoMeetings(clientId) {
  const { data, error } = await supabase
    .from('ceo_meetings')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'ceo_meetings'))
}

export async function addCeoMeeting(meeting, clientId) {
  const dbMeeting = toDb(meeting, 'ceo_meetings')
  delete dbMeeting.id
  dbMeeting.client_id = clientId
  const { data, error } = await supabase
    .from('ceo_meetings')
    .insert(dbMeeting)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'ceo_meetings')
}

export async function updateCeoMeeting(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'ceo_meetings')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('ceo_meetings').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteCeoMeeting(id, clientId) {
  const query = supabase.from('ceo_meetings').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

// ---- CEO PROJECTS ----
export async function getCeoProjects(clientId) {
  const { data, error } = await supabase
    .from('ceo_projects')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'ceo_projects'))
}

export async function addCeoProject(project, clientId) {
  const dbProject = toDb(project, 'ceo_projects')
  delete dbProject.id
  dbProject.client_id = clientId
  const { data, error } = await supabase
    .from('ceo_projects')
    .insert(dbProject)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'ceo_projects')
}

export async function updateCeoProject(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'ceo_projects')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('ceo_projects').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteCeoProject(id, clientId) {
  const query = supabase.from('ceo_projects').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

// ---- CEO IDEAS ----
export async function getCeoIdeas(clientId) {
  const { data, error } = await supabase
    .from('ceo_ideas')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'ceo_ideas'))
}

export async function addCeoIdea(idea, clientId) {
  const dbIdea = toDb(idea, 'ceo_ideas')
  delete dbIdea.id
  dbIdea.client_id = clientId
  const { data, error } = await supabase
    .from('ceo_ideas')
    .insert(dbIdea)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'ceo_ideas')
}

export async function updateCeoIdea(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'ceo_ideas')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('ceo_ideas').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteCeoIdea(id, clientId) {
  const query = supabase.from('ceo_ideas').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

// ---- CEO DAILY DIGESTS ----
export async function getCeoDailyDigests(clientId) {
  const { data, error } = await supabase
    .from('ceo_daily_digests')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'ceo_daily_digests'))
}

// ---- CEO WEEKLY DIGESTS ----
export async function getCeoWeeklyDigests(clientId) {
  const { data, error } = await supabase
    .from('ceo_weekly_digests')
    .select('*')
    .eq('client_id', clientId)
    .order('week_start', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'ceo_weekly_digests'))
}

// ---- CEO TEAM NOTES ----
export async function getCeoTeamNotes(clientId) {
  const { data, error } = await supabase
    .from('ceo_team_notes')
    .select('*')
    .eq('client_id', clientId)
  if (error) throw error
  return data.map(row => toApp(row, 'ceo_team_notes'))
}

export async function saveCeoTeamNote(memberId, note, clientId) {
  const { data: existing } = await supabase
    .from('ceo_team_notes')
    .select('id')
    .eq('client_id', clientId)
    .eq('member_id', memberId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('ceo_team_notes')
      .update({ note, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('ceo_team_notes')
      .insert({ client_id: clientId, member_id: memberId, note })
    if (error) throw error
  }
}

// ---- CEO INTEGRATIONS ----
export async function getCeoIntegrations(clientId) {
  const { data, error } = await supabase
    .from('ceo_integrations')
    .select('*')
    .eq('client_id', clientId)
  if (error) throw error
  return data.map(row => toApp(row, 'ceo_integrations'))
}

export async function saveCeoIntegration(integration, clientId) {
  const dbInt = toDb(integration, 'ceo_integrations')
  const { data: existing } = await supabase
    .from('ceo_integrations')
    .select('id')
    .eq('client_id', clientId)
    .eq('service', dbInt.service)
    .maybeSingle()

  if (existing) {
    delete dbInt.id
    delete dbInt.client_id
    delete dbInt.service
    const { error } = await supabase
      .from('ceo_integrations')
      .update(dbInt)
      .eq('id', existing.id)
    if (error) throw error
  } else {
    delete dbInt.id
    dbInt.client_id = clientId
    const { error } = await supabase
      .from('ceo_integrations')
      .insert(dbInt)
    if (error) throw error
  }
}

// ---- CEO FINANCE ENTRIES ----
export async function getCeoFinanceEntries(clientId) {
  const { data, error } = await supabase
    .from('ceo_finance_entries')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'ceo_finance_entries'))
}

export async function addCeoFinanceEntry(entry, clientId) {
  const dbEntry = toDb(entry, 'ceo_finance_entries')
  delete dbEntry.id
  dbEntry.client_id = clientId
  const { data, error } = await supabase
    .from('ceo_finance_entries')
    .insert(dbEntry)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'ceo_finance_entries')
}

export async function updateCeoFinanceEntry(id, updates, clientId) {
  const dbUpdates = toDb(updates, 'ceo_finance_entries')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const query = supabase.from('ceo_finance_entries').update(dbUpdates).eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function deleteCeoFinanceEntry(id, clientId) {
  const query = supabase.from('ceo_finance_entries').delete().eq('id', id)
  if (clientId) query.eq('client_id', clientId)
  const { error } = await query
  if (error) throw error
}

export async function getCeoFinanceSummary(clientId, yearMonth) {
  const monthStart = `${yearMonth}-01`
  const [year, month] = yearMonth.split('-').map(Number)
  const nextMonth = new Date(year, month, 1)
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

  const [salesRes, teamRes, entriesRes] = await Promise.all([
    supabase.from('sales_with_net_cash').select('*').eq('client_id', clientId).gte('date', monthStart).lt('date', monthEnd),
    supabase.from('team').select('*').eq('client_id', clientId),
    supabase.from('ceo_finance_entries').select('*').eq('client_id', clientId).gte('date', monthStart).lt('date', monthEnd),
  ])

  if (salesRes.error) throw salesRes.error
  if (teamRes.error) throw teamRes.error
  if (entriesRes.error) throw entriesRes.error

  const sales = salesRes.data || []
  const teamData = teamRes.data || []
  const entries = entriesRes.data || []

  const revenue = sales.reduce((s, v) => s + Number(v.revenue || 0), 0)
  const cashCollected = sales.reduce((s, v) => s + Number(v.cash_collected || 0), 0)
  const netCash = sales.reduce((s, v) => s + Number(v.net_cash || 0), 0)
  const fees = cashCollected - netCash

  // Commission calculation (matches CommissionsPage dual-role logic)
  let commissions = 0
  teamData.filter(m => m.active !== false).forEach(m => {
    const roles = (m.role || '').split(',').map(r => r.trim())
    const startDate = m.commission_start_date || null
    const mSales = startDate ? sales.filter(s => s.date >= startDate) : sales
    const mNetCash = mSales.reduce((s, v) => s + Number(v.net_cash || 0), 0)
    const closerCash = mSales.filter(s => s.closer === m.name).reduce((s, v) => s + Number(v.net_cash || 0), 0)
    const setterCash = mSales.filter(s => s.setter === m.name).reduce((s, v) => s + Number(v.net_cash || 0), 0)
    const isMulti = (roles.includes('closer') || roles.includes('setter')) && (roles.includes('manager') || roles.includes('director'))
    if (isMulti) {
      if (roles.includes('closer')) commissions += Math.round(closerCash * Number(m.closer_commission_rate || m.commission_rate || 0))
      if (roles.includes('setter')) commissions += Math.round(setterCash * Number(m.setter_commission_rate || m.commission_rate || 0))
      commissions += Math.round(mNetCash * Number(m.commission_rate || 0))
    } else if (roles.includes('closer')) {
      commissions += Math.round(closerCash * Number(m.closer_commission_rate || m.commission_rate || 0))
    } else if (roles.includes('setter')) {
      commissions += Math.round(setterCash * Number(m.setter_commission_rate || m.commission_rate || 0))
    } else {
      commissions += Math.round(mNetCash * Number(m.commission_rate || 0))
    }
  })

  const opex = entries.reduce((s, e) => s + Number(e.amount || 0), 0)
  const opexByCategory = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0)
    return acc
  }, {})

  return {
    revenue,
    cashCollected,
    netCash,
    fees,
    commissions,
    opex,
    opexByCategory,
    netProfit: netCash - commissions - opex,
    salesCount: sales.length,
  }
}

// Import a sale from Close CRM format
export async function importSaleFromClose(data, clientId) {
  const sale = {
    date: data.date || new Date().toISOString().split('T')[0],
    clientName: data.contact_name || data.clientName || '',
    clientEmail: data.contact_email || data.clientEmail || '',
    clientPhone: data.contact_phone || data.clientPhone || '',
    instagram: data['Instagram'] || data.instagram || '',
    product: data.product || data['Producto Interes'] || data.productoInteres || '',
    productoInteres: data['Producto Interes'] || data.productoInteres || '',
    paymentType: data['Tipo de pago'] || data.paymentType || 'Pago único',
    installmentNumber: data['Número de cuota'] || data.installmentNumber || 'Pago único',
    paymentMethod: data['Método de pago'] || data.paymentMethod || 'Transferencia',
    revenue: Number(data['Revenue (€)'] || data.revenue) || 0,
    cashCollected: Number(data['Cash Collected (€)'] || data.cashCollected) || 0,
    closer: data['Closer Asignado'] || data.closer || '',
    setter: data['Setter Asignado'] || data.setter || '',
    triager: data['Triager Asignado'] || data.triager || '',
    gestorAsignado: data['Gestor Asignado'] || data.gestorAsignado || '',
    utmSource: data['UTM Source'] || data.utmSource || '',
    utmMedium: data['UTM Medium'] || data.utmMedium || '',
    utmCampaign: data['UTM Campaign'] || data.utmCampaign || '',
    utmContent: data['UTM Content'] || data.utmContent || '',
    pais: data['País'] || data.pais || '',
    capitalDisponible: data['Capital Disponible'] || data.capitalDisponible || '',
    situacionActual: data['Situación Actual'] || data.situacionActual || '',
    expAmazon: data['Exp Amazon'] || data.expAmazon || '',
    decisorConfirmado: data['Decisor Confirmado'] || data.decisorConfirmado || '',
    fechaLlamada: data['Fecha de Llamada'] || data.fechaLlamada || '',
    status: data.status || 'Completada',
    notes: data['Notas'] || data.notes || '',
    source: 'close_crm',
    closeActivityId: data.activity_id || null,
  }
  return addSale(sale, clientId)
}

// ---- CLIENTS ----
export async function getClientBySlug(slug) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return toApp(data, 'clients')
}

export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')
  if (error) throw error
  return data.map(row => toApp(row, 'clients'))
}

// ---- SUPERADMIN ----
export async function authenticateSuperAdmin(email, password) {
  const { data, error } = await supabase
    .from('superadmins')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .eq('active', true)
    .maybeSingle()
  if (error || !data) return null
  const user = toApp(data, 'superadmins')
  delete user.password
  return user
}

export async function getSuperAdminCommissions() {
  const { data, error } = await supabase
    .from('superadmin_commissions')
    .select('*, clients(name, slug, logo_url)')
  if (error) throw error
  return data
}

export async function updateSuperAdminCommission(clientId, rate) {
  const { data, error } = await supabase
    .from('superadmin_commissions')
    .update({ commission_rate: rate })
    .eq('client_id', clientId)
    .select()
  if (error) throw error
  if (!data || data.length === 0) {
    const { data: inserted, error: insertErr } = await supabase
      .from('superadmin_commissions')
      .insert({ client_id: clientId, commission_rate: rate })
      .select()
    if (insertErr) throw insertErr
    return inserted[0]
  }
  return data[0]
}

export async function getAdminDashboardData() {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: clients },
    { data: sales },
    { data: commissions },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('active', true).order('name'),
    supabase.from('sales_with_net_cash').select('*').gte('date', monthStart).lt('date', monthEnd),
    supabase.from('superadmin_commissions').select('*'),
  ])

  const totalRevenue = (sales || []).reduce((sum, s) => sum + Number(s.revenue || 0), 0)
  const totalCash = (sales || []).reduce((sum, s) => sum + Number(s.cash_collected || 0), 0)
  const totalNetCash = (sales || []).reduce((sum, s) => sum + Number(s.net_cash || 0), 0)

  const clientSummaries = (clients || []).map(c => {
    const clientSales = (sales || []).filter(s => s.client_id === c.id)
    const cash = clientSales.reduce((sum, s) => sum + Number(s.cash_collected || 0), 0)
    const revenue = clientSales.reduce((sum, s) => sum + Number(s.revenue || 0), 0)
    const netCash = clientSales.reduce((sum, s) => sum + Number(s.net_cash || 0), 0)
    const comm = commissions?.find(co => co.client_id === c.id)
    const rate = comm ? Number(comm.commission_rate) : 0

    return {
      ...toApp(c, 'clients'),
      monthRevenue: revenue,
      monthCash: cash,
      monthNetCash: netCash,
      monthSales: clientSales.length,
      commissionRate: rate,
      commissionEarned: Math.round(cash * rate),
    }
  })

  const totalCommission = clientSummaries.reduce((sum, c) => sum + c.commissionEarned, 0)

  return {
    totalRevenue,
    totalCash,
    totalNetCash,
    totalSales: (sales || []).length,
    totalCommission,
    clients: clientSummaries,
  }
}
