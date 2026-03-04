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

export async function updateSale(id, updates) {
  const dbUpdates = toDb(updates, 'sales')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const { error } = await supabase
    .from('sales')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteSale(id) {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id)
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

export async function updateReport(id, updates) {
  const dbUpdates = toDb(updates, 'reports')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const { error } = await supabase
    .from('reports')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteReport(id) {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
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

export async function updateMember(id, updates) {
  const dbUpdates = toDb(updates, 'team')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const { error } = await supabase
    .from('team')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteMember(id) {
  const { error } = await supabase
    .from('team')
    .delete()
    .eq('id', id)
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

export async function updateProjection(id, updates) {
  const dbUpdates = toDb(updates, 'projections')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const { error } = await supabase
    .from('projections')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteProjection(id) {
  const { error } = await supabase
    .from('projections')
    .delete()
    .eq('id', id)
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

export async function updatePaymentFee(id, updates) {
  const dbUpdates = toDb(updates, 'payment_fees')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const { error } = await supabase
    .from('payment_fees')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deletePaymentFee(id) {
  const { error } = await supabase
    .from('payment_fees')
    .delete()
    .eq('id', id)
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
    const { error } = await supabase
      .from('n8n_config')
      .update(dbConfig)
      .eq('id', config.id)
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

export async function updateCeoMeeting(id, updates) {
  const dbUpdates = toDb(updates, 'ceo_meetings')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const { error } = await supabase
    .from('ceo_meetings')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteCeoMeeting(id) {
  const { error } = await supabase
    .from('ceo_meetings')
    .delete()
    .eq('id', id)
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

export async function updateCeoProject(id, updates) {
  const dbUpdates = toDb(updates, 'ceo_projects')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const { error } = await supabase
    .from('ceo_projects')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteCeoProject(id) {
  const { error } = await supabase
    .from('ceo_projects')
    .delete()
    .eq('id', id)
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

export async function updateCeoIdea(id, updates) {
  const dbUpdates = toDb(updates, 'ceo_ideas')
  delete dbUpdates.id
  delete dbUpdates.client_id
  const { error } = await supabase
    .from('ceo_ideas')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteCeoIdea(id) {
  const { error } = await supabase
    .from('ceo_ideas')
    .delete()
    .eq('id', id)
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
