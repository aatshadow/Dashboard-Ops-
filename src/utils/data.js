// Seed data & localStorage helpers

const SALES_KEY = 'fba_sales'
const REPORTS_KEY = 'fba_reports'
const TEAM_KEY = 'fba_team'
const PROJECTIONS_KEY = 'fba_projections'
const PAYMENT_FEES_KEY = 'fba_payment_fees'
const N8N_CONFIG_KEY = 'fba_n8n_config'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ---- SEED DATA ----
const seedSales = [
  { id: generateId(), date: '2026-02-20', clientName: 'Carlos Méndez', clientEmail: 'carlos@gmail.com', clientPhone: '+34 612 345 678', instagram: '@carlosm_fba', product: 'FBA Academy Pro', productoInteres: 'FBA Academy Pro', paymentType: 'Pago único', installmentNumber: 'Pago único', paymentMethod: 'Transferencia', revenue: 2997, cashCollected: 2997, closer: 'Emi', setter: 'Víctor', triager: '', gestorAsignado: '', utmSource: 'instagram', utmMedium: 'paid', utmCampaign: 'webinar_feb', utmContent: 'story_ad', pais: 'España', capitalDisponible: '5000-10000€', situacionActual: 'Empleado buscando alternativa', expAmazon: 'Sin experiencia', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-19', status: 'Completada', notes: '', source: 'manual' },
  { id: generateId(), date: '2026-02-21', clientName: 'María López', clientEmail: 'maria.lopez@hotmail.com', clientPhone: '+34 623 456 789', instagram: '@maria.lopez', product: 'Mentoring 1:1', productoInteres: 'Mentoring 1:1', paymentType: '2 cuotas', installmentNumber: '1/2', paymentMethod: 'Stripe', revenue: 5000, cashCollected: 2500, closer: 'Emi', setter: 'Marta', triager: '', gestorAsignado: '', utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'search_brand', utmContent: '', pais: 'México', capitalDisponible: '10000-20000€', situacionActual: 'Emprendedora activa', expAmazon: '6 meses', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-20', status: 'Pendiente', notes: 'Primera cuota de 2', source: 'manual' },
  { id: generateId(), date: '2026-02-22', clientName: 'Andrés Ruiz', clientEmail: 'andres.r@gmail.com', clientPhone: '+52 55 1234 5678', instagram: '@andresruiz', product: 'FBA Academy Pro', productoInteres: 'FBA Academy Pro', paymentType: 'Pago único', installmentNumber: 'Pago único', paymentMethod: 'Tarjeta', revenue: 2997, cashCollected: 2997, closer: 'Alejandro', setter: 'Víctor', triager: '', gestorAsignado: '', utmSource: 'facebook', utmMedium: 'paid', utmCampaign: 'reel_viral', utmContent: 'testimonio', pais: 'Colombia', capitalDisponible: '3000-5000€', situacionActual: 'Estudiante universitario', expAmazon: 'Sin experiencia', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-21', status: 'Completada', notes: '', source: 'manual' },
  { id: generateId(), date: '2026-02-23', clientName: 'Laura Sánchez', clientEmail: 'laura.s@yahoo.com', clientPhone: '+34 634 567 890', instagram: '@laura.sanchez', product: 'China Bootcamp', productoInteres: 'China Bootcamp', paymentType: '3 cuotas', installmentNumber: '1/3', paymentMethod: 'PayPal', revenue: 10000, cashCollected: 4000, closer: 'Emi', setter: 'Víctor', triager: '', gestorAsignado: '', utmSource: 'instagram', utmMedium: 'organic', utmCampaign: '', utmContent: '', pais: 'España', capitalDisponible: '20000+€', situacionActual: 'Vendedora Amazon activa', expAmazon: '1 año', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-22', status: 'Pendiente', notes: 'Primera cuota de 3', source: 'manual' },
  { id: generateId(), date: '2026-02-24', clientName: 'Diego Fernández', clientEmail: 'diego.f@outlook.com', clientPhone: '+34 645 678 901', instagram: '@diegof', product: 'FBA Academy Pro', productoInteres: 'FBA Academy Pro', paymentType: 'Pago único', installmentNumber: 'Pago único', paymentMethod: 'Stripe', revenue: 2997, cashCollected: 2997, closer: 'Alejandro', setter: 'Marta', triager: '', gestorAsignado: '', utmSource: 'youtube', utmMedium: 'organic', utmCampaign: '', utmContent: '', pais: 'Argentina', capitalDisponible: '5000-10000€', situacionActual: 'Freelancer', expAmazon: 'Sin experiencia', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-23', status: 'Completada', notes: '', source: 'manual' },
  { id: generateId(), date: '2026-02-25', clientName: 'Paula García', clientEmail: 'paula.g@gmail.com', clientPhone: '+34 656 789 012', instagram: '@paulag', product: 'Mentoring 1:1', productoInteres: 'Mentoring 1:1', paymentType: 'Pago único', installmentNumber: 'Pago único', paymentMethod: 'Transferencia', revenue: 5000, cashCollected: 5000, closer: 'Emi', setter: 'Marta', triager: '', gestorAsignado: '', utmSource: 'referral', utmMedium: 'organic', utmCampaign: '', utmContent: '', pais: 'España', capitalDisponible: '10000-20000€', situacionActual: 'Emprendedora activa', expAmazon: '3 meses', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-24', status: 'Completada', notes: 'Referida por cliente anterior', source: 'manual' },
  { id: generateId(), date: '2026-02-25', clientName: 'Javier Martín', clientEmail: 'javi.m@gmail.com', clientPhone: '+34 667 890 123', instagram: '@javim', product: 'FBA Academy Pro', productoInteres: 'FBA Academy Pro', paymentType: '2 cuotas', installmentNumber: '1/2', paymentMethod: 'Tarjeta', revenue: 2997, cashCollected: 1500, closer: 'Alejandro', setter: 'Víctor', triager: '', gestorAsignado: '', utmSource: 'instagram', utmMedium: 'paid', utmCampaign: 'webinar_feb', utmContent: 'carousel', pais: 'España', capitalDisponible: '3000-5000€', situacionActual: 'Empleado buscando alternativa', expAmazon: 'Sin experiencia', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-24', status: 'Pendiente', notes: '', source: 'manual' },
  { id: generateId(), date: '2026-02-26', clientName: 'Sofía Romero', clientEmail: 'sofia.r@gmail.com', clientPhone: '+34 678 901 234', instagram: '@sofiarom', product: 'China Bootcamp', productoInteres: 'China Bootcamp', paymentType: 'Pago único', installmentNumber: 'Pago único', paymentMethod: 'Transferencia', revenue: 10000, cashCollected: 10000, closer: 'Emi', setter: 'Víctor', triager: '', gestorAsignado: '', utmSource: 'tiktok', utmMedium: 'organic', utmCampaign: '', utmContent: '', pais: 'Chile', capitalDisponible: '20000+€', situacionActual: 'Vendedora Amazon activa', expAmazon: '2 años', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-25', status: 'Completada', notes: '', source: 'manual' },
  { id: generateId(), date: '2026-02-26', clientName: 'María López', clientEmail: 'maria.lopez@hotmail.com', clientPhone: '+34 623 456 789', instagram: '@maria.lopez', product: 'Mentoring 1:1', productoInteres: 'Mentoring 1:1', paymentType: '2 cuotas', installmentNumber: '2/2', paymentMethod: 'Stripe', revenue: 0, cashCollected: 2500, closer: 'Emi', setter: 'Marta', triager: '', gestorAsignado: '', utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'search_brand', utmContent: '', pais: 'México', capitalDisponible: '10000-20000€', situacionActual: 'Emprendedora activa', expAmazon: '6 meses', decisorConfirmado: 'Sí', fechaLlamada: '2026-02-20', status: 'Completada', notes: 'Segunda y última cuota', source: 'manual' },
]

const seedReports = [
  // Setters
  { id: generateId(), date: '2026-02-24', role: 'setter', name: 'Víctor', conversationsOpened: 45, followUps: 22, offersLaunched: 8, appointmentsBooked: 5 },
  { id: generateId(), date: '2026-02-24', role: 'setter', name: 'Marta', conversationsOpened: 38, followUps: 18, offersLaunched: 6, appointmentsBooked: 4 },
  { id: generateId(), date: '2026-02-25', role: 'setter', name: 'Víctor', conversationsOpened: 52, followUps: 25, offersLaunched: 10, appointmentsBooked: 7 },
  { id: generateId(), date: '2026-02-25', role: 'setter', name: 'Marta', conversationsOpened: 41, followUps: 20, offersLaunched: 7, appointmentsBooked: 3 },
  { id: generateId(), date: '2026-02-26', role: 'setter', name: 'Víctor', conversationsOpened: 48, followUps: 30, offersLaunched: 12, appointmentsBooked: 6 },
  { id: generateId(), date: '2026-02-26', role: 'setter', name: 'Marta', conversationsOpened: 35, followUps: 15, offersLaunched: 5, appointmentsBooked: 4 },
  // Closers
  { id: generateId(), date: '2026-02-24', role: 'closer', name: 'Emi', scheduledCalls: 6, callsMade: 5, offersLaunched: 4, deposits: 2, closes: 2 },
  { id: generateId(), date: '2026-02-24', role: 'closer', name: 'Alejandro', scheduledCalls: 5, callsMade: 4, offersLaunched: 3, deposits: 1, closes: 1 },
  { id: generateId(), date: '2026-02-25', role: 'closer', name: 'Emi', scheduledCalls: 8, callsMade: 7, offersLaunched: 5, deposits: 3, closes: 2 },
  { id: generateId(), date: '2026-02-25', role: 'closer', name: 'Alejandro', scheduledCalls: 6, callsMade: 5, offersLaunched: 4, deposits: 2, closes: 1 },
  { id: generateId(), date: '2026-02-26', role: 'closer', name: 'Emi', scheduledCalls: 7, callsMade: 6, offersLaunched: 5, deposits: 2, closes: 2 },
  { id: generateId(), date: '2026-02-26', role: 'closer', name: 'Alejandro', scheduledCalls: 5, callsMade: 5, offersLaunched: 3, deposits: 1, closes: 1 },
]

const seedTeam = [
  { id: generateId(), name: 'Emi', email: 'emi@fbaacademy.com', password: 'emi123', role: 'closer', active: true, commissionRate: 0.10 },
  { id: generateId(), name: 'Alejandro', email: 'alejandro@fbaacademy.com', password: 'ale123', role: 'closer', active: true, commissionRate: 0.10 },
  { id: generateId(), name: 'Víctor', email: 'victor@fbaacademy.com', password: 'vic123', role: 'setter', active: true, commissionRate: 0.05 },
  { id: generateId(), name: 'Marta', email: 'marta@fbaacademy.com', password: 'mar123', role: 'setter', active: true, commissionRate: 0.05 },
  { id: generateId(), name: 'Emi de la Sierra', email: 'emidelasierra@fbaacademypro.com', password: 'fba2026', role: 'director', active: true, commissionRate: 0.03 },
]

const seedProjections = []

const seedPaymentFees = [
  { id: generateId(), method: 'Transferencia', feeRate: 0 },
  { id: generateId(), method: 'Stripe', feeRate: 0.029 },
  { id: generateId(), method: 'PayPal', feeRate: 0.035 },
  { id: generateId(), method: 'Tarjeta', feeRate: 0.015 },
]

// ---- SALES ----
export function getSales() {
  const stored = localStorage.getItem(SALES_KEY)
  if (!stored) {
    localStorage.setItem(SALES_KEY, JSON.stringify(seedSales))
    return seedSales
  }
  // Backward compat: ensure new fields have defaults
  return JSON.parse(stored).map(s => ({
    installmentNumber: 'Pago único',
    notes: '',
    setter: '',
    source: 'manual',
    instagram: '',
    triager: '',
    gestorAsignado: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    productoInteres: '',
    capitalDisponible: '',
    situacionActual: '',
    pais: '',
    expAmazon: '',
    decisorConfirmado: '',
    fechaLlamada: '',
    ...s,
  }))
}

export function saveSales(sales) {
  localStorage.setItem(SALES_KEY, JSON.stringify(sales))
}

export function addSale(sale) {
  const sales = getSales()
  sales.push({ ...sale, id: generateId() })
  saveSales(sales)
  return sales
}

export function updateSale(id, updates) {
  const sales = getSales()
  const idx = sales.findIndex(s => s.id === id)
  if (idx !== -1) sales[idx] = { ...sales[idx], ...updates }
  saveSales(sales)
  return sales
}

export function deleteSale(id) {
  const sales = getSales().filter(s => s.id !== id)
  saveSales(sales)
  return sales
}

export function getSalesWithNetCash() {
  const sales = getSales()
  const fees = getPaymentFees()
  return sales.map(s => {
    const fee = fees.find(f => f.method === s.paymentMethod)
    const feeRate = fee ? fee.feeRate : 0
    return { ...s, netCash: Math.round(s.cashCollected * (1 - feeRate) * 100) / 100 }
  })
}

// ---- REPORTS ----
export function getReports() {
  const stored = localStorage.getItem(REPORTS_KEY)
  if (!stored) {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(seedReports))
    return seedReports
  }
  return JSON.parse(stored)
}

export function saveReports(reports) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
}

export function addReport(report) {
  const reports = getReports()
  reports.push({ ...report, id: generateId() })
  saveReports(reports)
  return reports
}

export function updateReport(id, updates) {
  const reports = getReports()
  const idx = reports.findIndex(r => r.id === id)
  if (idx !== -1) reports[idx] = { ...reports[idx], ...updates }
  saveReports(reports)
  return reports
}

export function deleteReport(id) {
  const reports = getReports().filter(r => r.id !== id)
  saveReports(reports)
  return reports
}

// ---- TEAM ----
export function getTeam() {
  const stored = localStorage.getItem(TEAM_KEY)
  if (!stored) {
    localStorage.setItem(TEAM_KEY, JSON.stringify(seedTeam))
    return seedTeam
  }
  return JSON.parse(stored)
}

export function saveTeam(team) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(team))
}

export function addMember(member) {
  const team = getTeam()
  team.push({ ...member, id: generateId() })
  saveTeam(team)
  return team
}

export function updateMember(id, updates) {
  const team = getTeam()
  const idx = team.findIndex(m => m.id === id)
  if (idx !== -1) team[idx] = { ...team[idx], ...updates }
  saveTeam(team)
  return team
}

export function deleteMember(id) {
  const team = getTeam().filter(m => m.id !== id)
  saveTeam(team)
  return team
}

export function authenticateUser(email, password) {
  const team = getTeam()
  return team.find(m => m.email === email && m.password === password && m.active) || null
}

// ---- PROJECTIONS ----
export function getProjections() {
  const stored = localStorage.getItem(PROJECTIONS_KEY)
  if (!stored) {
    localStorage.setItem(PROJECTIONS_KEY, JSON.stringify(seedProjections))
    return seedProjections
  }
  return JSON.parse(stored)
}

export function saveProjections(projections) {
  localStorage.setItem(PROJECTIONS_KEY, JSON.stringify(projections))
}

export function addProjection(projection) {
  const projections = getProjections()
  projections.push({ ...projection, id: generateId() })
  saveProjections(projections)
  return projections
}

export function updateProjection(id, updates) {
  const projections = getProjections()
  const idx = projections.findIndex(p => p.id === id)
  if (idx !== -1) projections[idx] = { ...projections[idx], ...updates }
  saveProjections(projections)
  return projections
}

export function deleteProjection(id) {
  const projections = getProjections().filter(p => p.id !== id)
  saveProjections(projections)
  return projections
}

// ---- PAYMENT FEES ----
export function getPaymentFees() {
  const stored = localStorage.getItem(PAYMENT_FEES_KEY)
  if (!stored) {
    localStorage.setItem(PAYMENT_FEES_KEY, JSON.stringify(seedPaymentFees))
    return seedPaymentFees
  }
  return JSON.parse(stored)
}

export function savePaymentFees(fees) {
  localStorage.setItem(PAYMENT_FEES_KEY, JSON.stringify(fees))
}

export function addPaymentFee(fee) {
  const fees = getPaymentFees()
  fees.push({ ...fee, id: generateId() })
  savePaymentFees(fees)
  return fees
}

export function updatePaymentFee(id, updates) {
  const fees = getPaymentFees()
  const idx = fees.findIndex(f => f.id === id)
  if (idx !== -1) fees[idx] = { ...fees[idx], ...updates }
  savePaymentFees(fees)
  return fees
}

export function deletePaymentFee(id) {
  const fees = getPaymentFees().filter(f => f.id !== id)
  savePaymentFees(fees)
  return fees
}

// ---- N8N CONFIG ----
export function getN8nConfig() {
  const stored = localStorage.getItem(N8N_CONFIG_KEY)
  if (!stored) {
    const defaultConfig = {
      webhookUrl: '',
      apiKey: generateId() + '-' + generateId(),
      enabled: false,
      lastSync: null,
    }
    localStorage.setItem(N8N_CONFIG_KEY, JSON.stringify(defaultConfig))
    return defaultConfig
  }
  return JSON.parse(stored)
}

export function saveN8nConfig(config) {
  localStorage.setItem(N8N_CONFIG_KEY, JSON.stringify(config))
}

// Import a sale from Close CRM format (via N8n) or direct JSON
export function importSaleFromClose(data) {
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
