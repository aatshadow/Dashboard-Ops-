import { supabase, toAppFormat, resolveClientId } from './lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query.action

  // POST ?action=login — SuperAdmin login
  if (req.method === 'POST' && action === 'login') {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })

    const { data, error } = await supabase
      .from('superadmins')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('active', true)
      .limit(1)

    if (error) return res.status(500).json({ error: error.message })
    if (!data || data.length === 0) return res.status(401).json({ error: 'Invalid credentials' })

    const user = toAppFormat(data[0], 'superadmins')
    delete user.password
    return res.status(200).json({ success: true, user })
  }

  // GET ?action=clients — List all clients with summary metrics
  if (req.method === 'GET' && action === 'clients') {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')

    if (error) return res.status(500).json({ error: error.message })

    // Get current month date range
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

    // Get commissions
    const { data: commissions } = await supabase
      .from('superadmin_commissions')
      .select('*')

    // Get sales summary per client for current month
    const enriched = await Promise.all(clients.map(async (client) => {
      const { data: sales } = await supabase
        .from('sales')
        .select('revenue, cash_collected, status')
        .eq('client_id', client.id)
        .gte('date', monthStart)
        .lt('date', monthEnd)

      const totalRevenue = (sales || []).reduce((sum, s) => sum + Number(s.revenue || 0), 0)
      const totalCash = (sales || []).reduce((sum, s) => sum + Number(s.cash_collected || 0), 0)
      const totalSales = (sales || []).length
      const commission = commissions?.find(c => c.client_id === client.id)

      return {
        ...toAppFormat(client, 'clients'),
        monthRevenue: totalRevenue,
        monthCash: totalCash,
        monthSales: totalSales,
        commissionRate: commission ? Number(commission.commission_rate) : 0,
        commissionEarned: commission ? Math.round(totalCash * Number(commission.commission_rate)) : 0,
      }
    }))

    return res.status(200).json({ clients: enriched })
  }

  // GET ?action=dashboard — Aggregated global dashboard
  if (req.method === 'GET' && action === 'dashboard') {
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

    const { data: sales } = await supabase
      .from('sales_with_net_cash')
      .select('*')
      .gte('date', monthStart)
      .lt('date', monthEnd)

    const { data: clients } = await supabase.from('clients').select('*').eq('active', true)
    const { data: commissions } = await supabase.from('superadmin_commissions').select('*')

    const totalRevenue = (sales || []).reduce((sum, s) => sum + Number(s.revenue || 0), 0)
    const totalCash = (sales || []).reduce((sum, s) => sum + Number(s.cash_collected || 0), 0)
    const totalNetCash = (sales || []).reduce((sum, s) => sum + Number(s.net_cash || 0), 0)

    // Commission per client
    const clientSummaries = (clients || []).map(c => {
      const clientSales = (sales || []).filter(s => s.client_id === c.id)
      const cash = clientSales.reduce((sum, s) => sum + Number(s.cash_collected || 0), 0)
      const revenue = clientSales.reduce((sum, s) => sum + Number(s.revenue || 0), 0)
      const comm = commissions?.find(co => co.client_id === c.id)
      const rate = comm ? Number(comm.commission_rate) : 0

      return {
        clientId: c.id,
        clientName: c.name,
        clientSlug: c.slug,
        logoUrl: c.logo_url,
        revenue,
        cash,
        salesCount: clientSales.length,
        commissionRate: rate,
        commissionEarned: Math.round(cash * rate),
      }
    })

    const totalCommission = clientSummaries.reduce((sum, c) => sum + c.commissionEarned, 0)

    return res.status(200).json({
      totalRevenue,
      totalCash,
      totalNetCash,
      totalSales: (sales || []).length,
      totalCommission,
      clients: clientSummaries,
    })
  }

  // GET ?action=commissions — SuperAdmin commission details
  if (req.method === 'GET' && action === 'commissions') {
    const { data, error } = await supabase
      .from('superadmin_commissions')
      .select('*, clients(name, slug, logo_url)')

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ commissions: data })
  }

  // PUT ?action=commission — Update commission rate for a client
  if (req.method === 'PUT' && action === 'commission') {
    const { clientId, commissionRate } = req.body
    if (!clientId) return res.status(400).json({ error: 'clientId is required' })

    const { data, error } = await supabase
      .from('superadmin_commissions')
      .update({ commission_rate: commissionRate })
      .eq('client_id', clientId)
      .select()

    if (error) return res.status(500).json({ error: error.message })
    if (!data || data.length === 0) {
      // Insert if not exists
      const { data: inserted, error: insertErr } = await supabase
        .from('superadmin_commissions')
        .insert({ client_id: clientId, commission_rate: commissionRate })
        .select()
      if (insertErr) return res.status(500).json({ error: insertErr.message })
      return res.status(200).json({ success: true, commission: inserted[0] })
    }

    return res.status(200).json({ success: true, commission: data[0] })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
