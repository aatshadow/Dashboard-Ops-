// POST /api/agent — AI analytics agent powered by Claude
// Fetches dashboard data FILTERED BY CLIENT and lets the user ask anything.

import Anthropic from '@anthropic-ai/sdk'
import { supabase, resolveClientId } from './lib/supabase.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(clientName, productList) {
  const productsSection = productList.length > 0
    ? `\nPRODUCTOS DE ${clientName.toUpperCase()}:\n${productList.map(p => `- ${p.name} (€${p.price || 0})${p.active ? '' : ' [INACTIVO]'}`).join('\n')}`
    : ''

  return `Eres el Director de Analítica de ${clientName}. Tienes acceso COMPLETO a todos los datos del dashboard de ${clientName}: ventas, reportes del equipo, proyecciones, comisiones y métodos de pago. Tu trabajo es dar análisis profundos, detectar patrones y recomendar acciones.

═══ CONTEXTO DEL NEGOCIO ═══

La estructura del equipo:

ROLES:
- **Director**: visión global, acceso total
- **Manager**: gestiona closers y setters
- **Closer**: cierra ventas por teléfono. Métricas clave: llamadas agendadas, realizadas, ofertas, depósitos, cierres
- **Setter**: genera agendas desde DMs/redes. Métricas clave: conversaciones, follow ups, ofertas lanzadas, agendas
${productsSection}
MÉTRICAS FINANCIERAS:
- **Revenue**: valor total del contrato firmado (lo que el cliente se compromete a pagar)
- **Cash Collected (bruto)**: dinero efectivamente cobrado
- **Cash Neto**: cash collected MENOS comisiones de pasarela de pago (Stripe, PayPal, etc.)
- **Revenue Pendiente**: revenue - cash collected (lo que falta por cobrar)

VENTAS:
- Pueden ser "Pago único" o en "Cuotas" (2, 3, 6 cuotas, etc.)
- Cada cuota es un registro independiente con su installment_number
- Estados: Completada, Pendiente, Reembolso
- Se atribuyen a un closer (quien cierra) y opcionalmente un setter (quien agendó)

REPORTES DIARIOS:
- Setters reportan: conversaciones abiertas, follow ups, ofertas lanzadas, agendas conseguidas
- Closers reportan: llamadas agendadas, llamadas realizadas, ofertas lanzadas, depósitos, cierres
- Ratios setters: Booking Rate = agendas/conversaciones, Offer Rate = ofertas/conversaciones
- Ratios closers: Show Rate = realizadas/agendadas, Close Rate = cierres/realizadas

PROYECCIONES:
- Pueden ser por empresa (global), por closer (cash target) o por setter (agendas target)
- Se configuran mensual o semanalmente
- El % de cumplimiento = actual/target * 100

COMISIONES:
- Cada miembro del equipo tiene una tasa de comisión (commission_rate)
- Closers cobran comisión sobre SU cash neto personal
- Otros roles cobran comisión sobre el cash neto TOTAL del equipo
- Comisión = cash_base × commission_rate

MÉTODOS DE PAGO:
- Cada método (Stripe, PayPal, Transferencia, etc.) tiene una fee_rate
- La fee se resta del cash collected para obtener el cash neto

═══ INSTRUCCIONES ═══

1. Responde SIEMPRE en español
2. Sé directo y usa datos específicos con números concretos
3. Cuando analices rendimiento individual, SIEMPRE compara con el promedio del equipo
4. Calcula ratios y porcentajes cuando sean relevantes
5. Si detectas anomalías o tendencias negativas, sugiere acciones concretas
6. Usa formato markdown: títulos ##, negritas **, listas -, tablas si son útiles
7. Si no hay datos suficientes, dilo claramente y sugiere qué información haría falta
8. Puedes cruzar datos entre secciones (ej: correlacionar reportes de setters con ventas de closers)
9. Para preguntas de proyecciones, calcula el pace actual y si se alcanzará el target
10. Sé proactivo: si ves algo interesante en los datos relacionado con la pregunta, menciónalo`
}

// ─── Fetch dashboard data FILTERED by clientId ───
async function fetchClientData(clientId) {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const firstOfMonth = `${currentMonth}-01`
  const today = now.toISOString().split('T')[0]

  // Previous month
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prevFirstOfMonth = `${prevMonth}-01`
  const prevLastOfMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  // Fetch everything in parallel — ALL filtered by client_id
  const [
    currentSalesResult,
    prevSalesResult,
    allSalesResult,
    currentReportsResult,
    prevReportsResult,
    teamResult,
    projectionsResult,
    feesResult,
    productsResult,
  ] = await Promise.all([
    supabase.from('sales_with_net_cash').select('*')
      .eq('client_id', clientId)
      .gte('date', firstOfMonth).order('date', { ascending: false }),
    supabase.from('sales_with_net_cash').select('*')
      .eq('client_id', clientId)
      .gte('date', prevFirstOfMonth).lte('date', prevLastOfMonth)
      .order('date', { ascending: false }),
    supabase.from('sales_with_net_cash').select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false }).limit(200),
    supabase.from('reports').select('*')
      .eq('client_id', clientId)
      .gte('date', firstOfMonth).order('date', { ascending: false }),
    supabase.from('reports').select('*')
      .eq('client_id', clientId)
      .gte('date', prevFirstOfMonth).lte('date', prevLastOfMonth)
      .order('date', { ascending: false }),
    supabase.from('team').select('*')
      .eq('client_id', clientId).order('name'),
    supabase.from('projections').select('*')
      .eq('client_id', clientId)
      .order('period', { ascending: false }).limit(50),
    supabase.from('payment_fees').select('*')
      .eq('client_id', clientId).order('method'),
    supabase.from('products').select('*')
      .eq('client_id', clientId).order('name'),
  ])

  const currentSales = currentSalesResult.data || []
  const prevSales = prevSalesResult.data || []
  const allSales = allSalesResult.data || []
  const currentReports = currentReportsResult.data || []
  const prevReports = prevReportsResult.data || []
  const team = teamResult.data || []
  const projections = projectionsResult.data || []
  const fees = feesResult.data || []
  const products = productsResult.data || []

  // ─── SALES SUMMARIES ───
  function summarizeSales(sales, label) {
    const totalRevenue = sales.reduce((s, v) => s + (Number(v.revenue) || 0), 0)
    const totalCash = sales.reduce((s, v) => s + (Number(v.net_cash) || 0), 0)
    const totalGross = sales.reduce((s, v) => s + (Number(v.cash_collected) || 0), 0)
    const count = sales.length

    const byCloser = {}
    for (const s of sales) {
      const c = s.closer || 'Sin closer'
      if (!byCloser[c]) byCloser[c] = { ventas: 0, revenue: 0, cashNeto: 0 }
      byCloser[c].ventas++
      byCloser[c].revenue += Number(s.revenue) || 0
      byCloser[c].cashNeto += Number(s.net_cash) || 0
    }

    const bySetter = {}
    for (const s of sales) {
      const st = s.setter || 'Sin setter'
      if (!bySetter[st]) bySetter[st] = { ventas: 0, revenue: 0, cashNeto: 0 }
      bySetter[st].ventas++
      bySetter[st].revenue += Number(s.revenue) || 0
      bySetter[st].cashNeto += Number(s.net_cash) || 0
    }

    const byProduct = {}
    for (const s of sales) {
      const p = s.product || 'Sin producto'
      if (!byProduct[p]) byProduct[p] = { ventas: 0, revenue: 0, cashNeto: 0 }
      byProduct[p].ventas++
      byProduct[p].revenue += Number(s.revenue) || 0
      byProduct[p].cashNeto += Number(s.net_cash) || 0
    }

    const byStatus = {}
    for (const s of sales) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1
    }

    const byMethod = {}
    for (const s of sales) {
      const m = s.payment_method || 'Desconocido'
      if (!byMethod[m]) byMethod[m] = { ventas: 0, cashBruto: 0 }
      byMethod[m].ventas++
      byMethod[m].cashBruto += Number(s.cash_collected) || 0
    }

    const byPayType = {}
    for (const s of sales) {
      const t = s.payment_type || 'Pago único'
      if (!byPayType[t]) byPayType[t] = { ventas: 0, revenue: 0 }
      byPayType[t].ventas++
      byPayType[t].revenue += Number(s.revenue) || 0
    }

    const byCountry = {}
    for (const s of sales) {
      const p = s.pais || 'Sin país'
      if (!byCountry[p]) byCountry[p] = { ventas: 0, revenue: 0 }
      byCountry[p].ventas++
      byCountry[p].revenue += Number(s.revenue) || 0
    }

    const byUtm = {}
    for (const s of sales) {
      const u = s.utm_source || 'Directo'
      if (!byUtm[u]) byUtm[u] = { ventas: 0, revenue: 0 }
      byUtm[u].ventas++
      byUtm[u].revenue += Number(s.revenue) || 0
    }

    const byDay = {}
    for (const s of sales) {
      if (!byDay[s.date]) byDay[s.date] = { revenue: 0, cashNeto: 0, ventas: 0 }
      byDay[s.date].revenue += Number(s.revenue) || 0
      byDay[s.date].cashNeto += Number(s.net_cash) || 0
      byDay[s.date].ventas++
    }

    return {
      periodo: label,
      totalVentas: count,
      revenue: totalRevenue,
      cashNeto: totalCash,
      cashBruto: totalGross,
      revenuePendiente: totalRevenue - totalGross,
      ticketMedio: count > 0 ? Math.round(totalRevenue / count) : 0,
      porCloser: byCloser,
      porSetter: bySetter,
      porProducto: byProduct,
      estadoVentas: byStatus,
      porMetodoPago: byMethod,
      porTipoPago: byPayType,
      porPais: byCountry,
      porUtmSource: byUtm,
      porDia: byDay,
    }
  }

  // ─── REPORTS SUMMARIES ───
  function summarizeReports(reports, label) {
    const setterReports = reports.filter(r => r.role === 'setter')
    const closerReports = reports.filter(r => r.role === 'closer')

    const setterTotals = {
      conversaciones: setterReports.reduce((s, r) => s + (r.conversations_opened || 0), 0),
      followUps: setterReports.reduce((s, r) => s + (r.follow_ups || 0), 0),
      ofertas: setterReports.reduce((s, r) => s + (r.offers_launched || 0), 0),
      agendas: setterReports.reduce((s, r) => s + (r.appointments_booked || 0), 0),
    }
    setterTotals.bookingRate = setterTotals.conversaciones > 0
      ? Math.round(setterTotals.agendas / setterTotals.conversaciones * 100) : 0
    setterTotals.offerRate = setterTotals.conversaciones > 0
      ? Math.round(setterTotals.ofertas / setterTotals.conversaciones * 100) : 0

    const closerTotals = {
      agendadas: closerReports.reduce((s, r) => s + (r.scheduled_calls || 0), 0),
      realizadas: closerReports.reduce((s, r) => s + (r.calls_made || 0), 0),
      ofertas: closerReports.reduce((s, r) => s + (r.offers_launched || 0), 0),
      depositos: closerReports.reduce((s, r) => s + (r.deposits || 0), 0),
      cierres: closerReports.reduce((s, r) => s + (r.closes || 0), 0),
    }
    closerTotals.showRate = closerTotals.agendadas > 0
      ? Math.round(closerTotals.realizadas / closerTotals.agendadas * 100) : 0
    closerTotals.closeRate = closerTotals.realizadas > 0
      ? Math.round(closerTotals.cierres / closerTotals.realizadas * 100) : 0

    const setterByPerson = {}
    for (const r of setterReports) {
      if (!setterByPerson[r.name]) setterByPerson[r.name] = { conversaciones: 0, followUps: 0, ofertas: 0, agendas: 0, dias: 0 }
      setterByPerson[r.name].conversaciones += r.conversations_opened || 0
      setterByPerson[r.name].followUps += r.follow_ups || 0
      setterByPerson[r.name].ofertas += r.offers_launched || 0
      setterByPerson[r.name].agendas += r.appointments_booked || 0
      setterByPerson[r.name].dias++
    }
    for (const name of Object.keys(setterByPerson)) {
      const p = setterByPerson[name]
      p.bookingRate = p.conversaciones > 0 ? Math.round(p.agendas / p.conversaciones * 100) : 0
      p.offerRate = p.conversaciones > 0 ? Math.round(p.ofertas / p.conversaciones * 100) : 0
    }

    const closerByPerson = {}
    for (const r of closerReports) {
      if (!closerByPerson[r.name]) closerByPerson[r.name] = { agendadas: 0, realizadas: 0, ofertas: 0, depositos: 0, cierres: 0, dias: 0 }
      closerByPerson[r.name].agendadas += r.scheduled_calls || 0
      closerByPerson[r.name].realizadas += r.calls_made || 0
      closerByPerson[r.name].ofertas += r.offers_launched || 0
      closerByPerson[r.name].depositos += r.deposits || 0
      closerByPerson[r.name].cierres += r.closes || 0
      closerByPerson[r.name].dias++
    }
    for (const name of Object.keys(closerByPerson)) {
      const p = closerByPerson[name]
      p.showRate = p.agendadas > 0 ? Math.round(p.realizadas / p.agendadas * 100) : 0
      p.closeRate = p.realizadas > 0 ? Math.round(p.cierres / p.realizadas * 100) : 0
    }

    return {
      periodo: label,
      setters: { totales: setterTotals, porPersona: setterByPerson },
      closers: { totales: closerTotals, porPersona: closerByPerson },
    }
  }

  // ─── COMMISSIONS ───
  function computeCommissions(sales, teamList) {
    const totalNetCash = sales.reduce((s, v) => s + (Number(v.net_cash) || 0), 0)
    const cashByCloser = {}
    for (const s of sales) {
      cashByCloser[s.closer] = (cashByCloser[s.closer] || 0) + (Number(s.net_cash) || 0)
    }

    return teamList.filter(m => m.active).map(m => {
      const isCloser = (m.role || '').includes('closer')
      const cashBase = isCloser ? (cashByCloser[m.name] || 0) : totalNetCash
      const commission = Math.round(cashBase * (m.commission_rate || 0))
      return { nombre: m.name, rol: m.role, tasa: m.commission_rate, cashBase, comision: commission }
    })
  }

  // ─── PACE PROJECTION ───
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const currentCash = currentSales.reduce((s, v) => s + (Number(v.net_cash) || 0), 0)
  const currentRevenue = currentSales.reduce((s, v) => s + (Number(v.revenue) || 0), 0)
  const paceCash = dayOfMonth > 0 ? Math.round(currentCash / dayOfMonth * daysInMonth) : currentCash
  const paceRevenue = dayOfMonth > 0 ? Math.round(currentRevenue / dayOfMonth * daysInMonth) : currentRevenue

  // ─── PROJECTIONS CONTEXT ───
  const currentProjections = projections.filter(p => {
    const period = p.period || p.month
    return period && period.startsWith(currentMonth)
  })

  return {
    fechaConsulta: today,
    mesActual: currentMonth,
    diaDelMes: dayOfMonth,
    diasEnMes: daysInMonth,

    ventasMesActual: summarizeSales(currentSales, `Mes actual: ${currentMonth}`),
    ventasMesAnterior: summarizeSales(prevSales, `Mes anterior: ${prevMonth}`),

    reportesMesActual: summarizeReports(currentReports, `Mes actual: ${currentMonth}`),
    reportesMesAnterior: summarizeReports(prevReports, `Mes anterior: ${prevMonth}`),

    proyeccionPace: {
      cashNetoProyectado: paceCash,
      revenueProyectado: paceRevenue,
      diasTranscurridos: dayOfMonth,
      diasRestantes: daysInMonth - dayOfMonth,
    },

    proyecciones: currentProjections.map(p => ({
      tipo: p.type,
      nombre: p.name,
      periodo: p.period,
      cashTarget: p.cash_target,
      revenueTarget: p.revenue_target,
      appointmentTarget: p.appointment_target,
    })),

    comisionesEstimadas: computeCommissions(currentSales, team),

    equipo: team.map(m => ({
      nombre: m.name,
      email: m.email,
      rol: m.role,
      activo: m.active,
      tasaComision: m.commission_rate,
    })),

    metodosPago: fees.map(f => ({
      metodo: f.method,
      comisionPasarela: f.fee_rate,
    })),

    productos: products.map(p => ({
      nombre: p.name,
      precio: p.price,
      activo: p.active,
    })),

    ventasRecientes: currentSales.slice(0, 40).map(s => ({
      fecha: s.date,
      cliente: s.client_name,
      producto: s.product,
      revenue: s.revenue,
      cashCollected: s.cash_collected,
      cashNeto: s.net_cash,
      closer: s.closer,
      setter: s.setter,
      metodo: s.payment_method,
      tipoPago: s.payment_type,
      cuota: s.installment_number,
      estado: s.status,
      pais: s.pais,
      utmSource: s.utm_source,
    })),

    historicoMensual: (() => {
      const months = {}
      for (const s of allSales) {
        const m = s.date?.slice(0, 7)
        if (!m) continue
        if (!months[m]) months[m] = { revenue: 0, cashNeto: 0, ventas: 0 }
        months[m].revenue += Number(s.revenue) || 0
        months[m].cashNeto += Number(s.net_cash) || 0
        months[m].ventas++
      }
      return months
    })(),

    products,
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, history, clientSlug } = req.body
  if (!question) {
    return res.status(400).json({ error: 'question is required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  // Resolve client
  const clientId = await resolveClientId(clientSlug)
  if (!clientId) {
    return res.status(400).json({ error: 'clientSlug is required' })
  }

  // Get client name
  const { data: clientRow } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single()
  const clientName = clientRow?.name || 'Dashboard'

  let dashboardData
  try {
    dashboardData = await fetchClientData(clientId)
  } catch (err) {
    console.error('Supabase fetch error:', err)
    return res.status(500).json({ error: 'Error fetching dashboard data: ' + err.message })
  }

  const systemPrompt = buildSystemPrompt(clientName, dashboardData.products || [])

  // Build conversation messages
  const messages = []

  if (Array.isArray(history)) {
    for (const msg of history.slice(-20)) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({
    role: 'user',
    content: `DATOS COMPLETOS DEL DASHBOARD (consulta: ${dashboardData.fechaConsulta}):\n\`\`\`json\n${JSON.stringify(dashboardData, null, 2)}\n\`\`\`\n\nPREGUNTA: ${question}`,
  })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    return res.status(200).json({
      answer: text,
      usage: response.usage,
    })
  } catch (error) {
    console.error('Agent error:', error)

    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(401).json({ error: 'Invalid Anthropic API key' })
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Rate limited — try again in a moment' })
    }
    if (error instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Claude API error: ${error.message}` })
    }

    return res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
}
