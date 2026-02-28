import { supabase, toDb, toApp } from './supabase'

// ---- SALES ----
export async function getSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'sales'))
}

export async function addSale(sale) {
  const dbSale = toDb(sale, 'sales')
  delete dbSale.id
  const { data, error } = await supabase
    .from('sales')
    .insert(dbSale)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'sales')
}

export async function addSales(sales) {
  const dbSales = sales.map(s => {
    const d = toDb(s, 'sales')
    delete d.id
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

export async function getSalesWithNetCash() {
  const { data, error } = await supabase
    .from('sales_with_net_cash')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => {
    const sale = toApp(row, 'sales')
    sale.netCash = Number(row.net_cash) || 0
    return sale
  })
}

// ---- REPORTS ----
export async function getReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'reports'))
}

export async function addReport(report) {
  const dbReport = toDb(report, 'reports')
  delete dbReport.id
  const { data, error } = await supabase
    .from('reports')
    .insert(dbReport)
    .select()
    .single()
  if (error) throw error
  return toApp(data, 'reports')
}

export async function addReports(reports) {
  const dbReports = reports.map(r => {
    const d = toDb(r, 'reports')
    delete d.id
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
export async function getTeam() {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .order('name')
  if (error) throw error
  return data.map(row => toApp(row, 'team'))
}

export async function addMember(member) {
  const dbMember = toDb(member, 'team')
  delete dbMember.id
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

export async function authenticateUser(email, password) {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .eq('active', true)
    .maybeSingle()
  if (error || !data) return null
  return toApp(data, 'team')
}

// ---- PROJECTIONS ----
export async function getProjections() {
  const { data, error } = await supabase
    .from('projections')
    .select('*')
    .order('period', { ascending: false })
  if (error) throw error
  return data.map(row => toApp(row, 'projections'))
}

export async function addProjection(projection) {
  const dbProjection = toDb(projection, 'projections')
  delete dbProjection.id
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
export async function getPaymentFees() {
  const { data, error } = await supabase
    .from('payment_fees')
    .select('*')
    .order('method')
  if (error) throw error
  return data.map(row => toApp(row, 'payment_fees'))
}

export async function addPaymentFee(fee) {
  const dbFee = toDb(fee, 'payment_fees')
  delete dbFee.id
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
export async function getN8nConfig() {
  const { data, error } = await supabase
    .from('n8n_config')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error || !data) return { id: null, webhookUrl: '', apiKey: '', enabled: false, lastSync: null }
  return toApp(data, 'n8n_config')
}

export async function saveN8nConfig(config) {
  const dbConfig = toDb(config, 'n8n_config')
  if (config.id) {
    delete dbConfig.id
    const { error } = await supabase
      .from('n8n_config')
      .update(dbConfig)
      .eq('id', config.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('n8n_config')
      .insert(dbConfig)
    if (error) throw error
  }
}

// Import a sale from Close CRM format
export async function importSaleFromClose(data) {
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
  return addSale(sale)
}
