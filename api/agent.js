// POST /api/agent — Unified AI agent
// Two modes:
//   1. Analytics: { question, history, clientSlug } — Claude-powered dashboard analytics
//   2. Prospector: { action, clientSlug, config } — Google Maps lead search + CRM insert

import Anthropic from '@anthropic-ai/sdk'
import { supabase, resolveClientId } from './lib/supabase.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ═══════════════════════════════════════════════════════════════════════════════
// PROSPECTOR AGENT — Multi-source search + AI enrichment + CRM insert
// Sources: OpenStreetMap Overpass, Nominatim, Europages scraping
// ═══════════════════════════════════════════════════════════════════════════════

const COUNTRY_CODES = {
  'Espana': 'ES', 'Portugal': 'PT', 'Italia': 'IT', 'Francia': 'FR', 'Alemania': 'DE',
  'Reino Unido': 'GB', 'Paises Bajos': 'NL', 'Belgica': 'BE', 'Polonia': 'PL', 'Turquia': 'TR',
  'Rumania': 'RO', 'Republica Checa': 'CZ', 'Austria': 'AT', 'Suiza': 'CH', 'Suecia': 'SE',
  'Bulgaria': 'BG',
}

const COUNTRY_NAMES_EN = {
  'Espana': 'Spain', 'Portugal': 'Portugal', 'Italia': 'Italy', 'Francia': 'France',
  'Alemania': 'Germany', 'Reino Unido': 'United Kingdom', 'Paises Bajos': 'Netherlands',
  'Belgica': 'Belgium', 'Polonia': 'Poland', 'Turquia': 'Turkey', 'Rumania': 'Romania',
  'Republica Checa': 'Czech Republic', 'Austria': 'Austria', 'Suiza': 'Switzerland',
  'Suecia': 'Sweden', 'Bulgaria': 'Bulgaria',
}

// ── Source 1: Overpass API (fast tag-based OSM search) ──
async function searchOverpass(country, maxResults) {
  const isoCode = COUNTRY_CODES[country] || country
  const q = `[out:json][timeout:25];area["ISO3166-1"="${isoCode}"]->.a;(nwr["craft"~"textile|weaving"](area.a);nwr["shop"~"fabric|textile"](area.a);nwr["industrial"~"textile"](area.a););out center body ${maxResults * 2};`

  const resp = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(q)}`,
  })
  if (!resp.ok) return []
  const data = await resp.json()

  const seen = new Set()
  const results = []
  for (const el of (data.elements || [])) {
    if (results.length >= maxResults) break
    const t = el.tags || {}
    const name = t.name || t['name:es'] || t['name:en'] || t['name:it'] || t['name:de'] || t['name:fr'] || t['name:pt'] || ''
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    const lat = el.lat || el.center?.lat || ''
    const lng = el.lon || el.center?.lon || ''
    results.push({
      name, source_type: 'OpenStreetMap',
      address: [t['addr:street'], t['addr:housenumber'], t['addr:postcode'], t['addr:city']].filter(Boolean).join(', ') || '',
      city: t['addr:city'] || '', country,
      phone: t.phone || t['contact:phone'] || '',
      email: t.email || t['contact:email'] || '',
      website: t.website || t['contact:website'] || '',
      maps_url: lat && lng ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}` : '',
      lat, lng,
    })
  }
  return results
}

// ── Source 2: Nominatim (free-text geocoding search) ──
async function searchNominatim(country, maxResults) {
  const isoCode = (COUNTRY_CODES[country] || country).toLowerCase()
  const terms = [`textile factory`, `fabrica textil`, `textile manufacturer`, `textile mill`, `fabric company`]
  const seen = new Set()
  const results = []

  for (const term of terms) {
    if (results.length >= maxResults) break
    try {
      const params = new URLSearchParams({
        q: `${term} ${country}`, format: 'json', limit: '10',
        countrycodes: isoCode, addressdetails: '1', extratags: '1',
      })
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'BlackWolfProspector/1.0' },
      })
      if (!resp.ok) continue
      const places = await resp.json()

      for (const p of places) {
        if (results.length >= maxResults) break
        const name = p.name || p.display_name?.split(',')[0] || ''
        if (!name || seen.has(name.toLowerCase())) continue
        seen.add(name.toLowerCase())
        const extra = p.extratags || {}
        const addr = p.address || {}
        results.push({
          name, source_type: 'Nominatim',
          address: [addr.road, addr.house_number, addr.postcode, addr.city || addr.town || addr.village].filter(Boolean).join(', ') || '',
          city: addr.city || addr.town || addr.village || '', country,
          phone: extra.phone || extra['contact:phone'] || '',
          email: extra.email || extra['contact:email'] || '',
          website: extra.website || extra['contact:website'] || '',
          maps_url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`,
          lat: p.lat, lng: p.lon,
        })
      }
      await new Promise(r => setTimeout(r, 1100))
    } catch { /* skip */ }
  }
  return results
}

// ── Source 3: Europages (European B2B business directory) ──
async function searchEuropages(country, maxResults) {
  const countryEn = COUNTRY_NAMES_EN[country] || country
  const results = []

  try {
    // Europages search URL
    const url = `https://www.europages.co.uk/companies/textile%20manufacturer/${countryEn.toLowerCase().replace(/\s+/g, '-')}.html`
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    if (!resp.ok) return []
    const html = await resp.text()

    // Extract company data from Europages HTML
    const companyPattern = /<h3[^>]*class="[^"]*company-name[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi
    const addressPattern = /<span[^>]*class="[^"]*address[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    const phonePattern = /(?:tel|phone|fono)[:\s]*([+\d\s()-]{8,})/gi
    const websitePattern = /(?:href=")(https?:\/\/(?:www\.)?[^"]+)(?:"[^>]*class="[^"]*website)/gi

    // Simpler extraction: look for structured data or company blocks
    const nameMatches = html.match(/data-company-name="([^"]+)"/gi) || []
    const seen = new Set()

    for (const match of nameMatches) {
      if (results.length >= maxResults) break
      const name = match.replace(/data-company-name="/, '').replace(/"$/, '').trim()
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())

      results.push({
        name, source_type: 'Europages',
        address: '', city: '', country,
        phone: '', email: '', website: '',
        maps_url: '', lat: '', lng: '',
      })
    }

    // Fallback: extract from heading tags
    if (results.length === 0) {
      const h3Matches = html.match(/<h[23][^>]*>([^<]{3,80})<\/h[23]>/gi) || []
      for (const h of h3Matches) {
        if (results.length >= maxResults) break
        const name = h.replace(/<\/?h[23][^>]*>/gi, '').trim()
        if (!name || name.length < 3 || name.length > 80 || seen.has(name.toLowerCase())) continue
        // Filter out non-company names
        if (/search|filter|result|page|textile manufacturer/i.test(name)) continue
        seen.add(name.toLowerCase())
        results.push({
          name, source_type: 'Europages',
          address: '', city: '', country,
          phone: '', email: '', website: '',
          maps_url: '', lat: '', lng: '',
        })
      }
    }
  } catch { /* Europages unavailable */ }

  return results
}

// ── Combined search across all sources ──
async function searchBusinesses(country, maxResults = 20) {
  // Run Overpass and Europages in parallel, Nominatim sequentially (rate limited)
  const [overpassResults, europagesResults] = await Promise.all([
    searchOverpass(country, maxResults).catch(() => []),
    searchEuropages(country, Math.ceil(maxResults / 2)).catch(() => []),
  ])

  // Merge and deduplicate
  const seen = new Set()
  const all = []

  for (const r of [...overpassResults, ...europagesResults]) {
    if (all.length >= maxResults) break
    const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seen.has(key)) continue
    seen.add(key)
    all.push(r)
  }

  // Fill remaining with Nominatim
  if (all.length < maxResults) {
    const nominatimResults = await searchNominatim(country, maxResults - all.length).catch(() => [])
    for (const r of nominatimResults) {
      if (all.length >= maxResults) break
      const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (seen.has(key)) continue
      seen.add(key)
      all.push(r)
    }
  }

  return all
}

// ── AI Enrichment: Find CEO, emails, LinkedIn from company info ──
async function enrichWithAI(companies) {
  if (!companies.length) return []

  const companySummaries = companies.map((c, i) =>
    `${i + 1}. "${c.name}" — ${c.address || c.country}${c.website ? ` — Web: ${c.website}` : ''}${c.phone ? ` — Tel: ${c.phone}` : ''}`
  ).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `Eres un agente de inteligencia comercial B2B de nivel enterprise. Investigas empresas europeas del sector textil para encontrar informacion de contacto de sus directivos.

INSTRUCCIONES ESTRICTAS:
1. Para cada empresa, deduce el CEO/Director/Gerente mas probable
2. Genera emails de contacto REALES basados en el dominio web: info@, contacto@, direccion@, admin@
3. Si no hay web, genera emails basados en el nombre de empresa (sin espacios, normalizado)
4. Genera la URL exacta de busqueda en LinkedIn para encontrar al CEO
5. Clasifica tamano: micro (<10), pequena (10-50), mediana (50-250), grande (250+)
6. Identifica el sector especifico: hilatura, tejeduria, confeccion, acabados, fibras, maquinaria textil, etc
7. SIEMPRE responde en JSON valido, sin texto adicional`,
    messages: [{
      role: 'user',
      content: `Analiza estas ${companies.length} empresas textiles europeas:

${companySummaries}

Responde SOLO con un JSON array:
[{
  "index": 1,
  "estimated_ceo": "nombre completo o 'No disponible'",
  "ceo_title": "CEO|Director General|Gerente|Managing Director",
  "contact_emails": ["info@dominio.com", "direccion@dominio.com"],
  "phone_guess": "+34 XXX XXX XXX (formato internacional del pais)",
  "linkedin_search_url": "https://www.linkedin.com/search/results/people/?keywords=CEO%20NombreEmpresa",
  "company_size": "micro|pequena|mediana|grande",
  "sector_specific": "hilatura|tejeduria|confeccion|acabados|fibras|distribucion",
  "sector_tags": ["textil", "fabricacion", "europa"],
  "website_guess": "https://www.nombreempresa.com",
  "notes": "observacion comercial util"
}]`
    }],
  })

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return companies.map(() => ({}))
  try { return JSON.parse(jsonMatch[0]) } catch { return companies.map(() => ({})) }
}

// ── Insert leads into CRM with PROPER field mapping ──
async function insertLeadsIntoCRM(clientId, leads, enrichments, runId) {
  const inserted = []
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const ai = enrichments[i] || {}

    // Deduplicate by company name
    const { data: existing } = await supabase
      .from('crm_contacts').select('id')
      .eq('client_id', clientId).eq('company', lead.name).limit(1)

    if (existing && existing.length > 0) {
      inserted.push({ name: lead.name, crm_status: 'duplicate', crm_id: existing[0].id })
      continue
    }

    // Map to CRM fields properly — NO dumping into notes
    const contactData = {
      client_id: clientId,
      // Person
      name: ai.estimated_ceo && ai.estimated_ceo !== 'No disponible' ? ai.estimated_ceo : `Director/a — ${lead.name}`,
      position: ai.ceo_title || 'CEO / Director',
      // Company
      company: lead.name,
      // Contact info — each in its OWN field
      email: ai.contact_emails?.[0] || lead.email || '',
      phone: lead.phone || ai.phone_guess || '',
      website: lead.website || ai.website_guess || '',
      address: lead.address || '',
      country: lead.country || '',
      linkedin: ai.linkedin_search_url || '',
      // CRM metadata
      source: 'Agente Prospector',
      status: 'lead',
      tags: JSON.stringify([
        ...(ai.sector_tags || ['textil']),
        ai.sector_specific || 'textil',
        ai.company_size || 'desconocido',
        lead.source_type || 'OSM',
        'prospector-agent',
      ].filter(Boolean)),
      // Notes — ONLY for extra context, not contact data
      notes: [
        ai.notes || '',
        ai.contact_emails?.length > 1 ? `Emails alternativos: ${ai.contact_emails.slice(1).join(', ')}` : '',
        lead.maps_url ? `Mapa: ${lead.maps_url}` : '',
        `Fuente: ${lead.source_type || 'OpenStreetMap'}`,
      ].filter(Boolean).join('\n') || '',
      // Extra data in custom_fields
      custom_fields: JSON.stringify({
        agent_run_id: runId,
        source_type: lead.source_type,
        company_size: ai.company_size || '',
        sector_specific: ai.sector_specific || '',
        all_emails: ai.contact_emails || [],
        lat: lead.lat || '', lng: lead.lng || '',
        maps_url: lead.maps_url || '',
      }),
      deal_value: 0,
    }

    const { data: contact, error } = await supabase
      .from('crm_contacts').insert(contactData).select('id').single()

    if (error) {
      inserted.push({ name: lead.name, crm_status: 'error', error: error.message })
    } else {
      await supabase.from('crm_activities').insert({
        client_id: clientId, contact_id: contact.id, type: 'note',
        title: `Lead capturado — ${lead.source_type || 'Prospector'}`,
        description: `Empresa: ${lead.name}\nPais: ${lead.country}\nDireccion: ${lead.address}\nWeb: ${lead.website || ai.website_guess || 'N/A'}\nSector: ${ai.sector_specific || 'textil'}`,
        performed_by: 'AI Prospector Agent',
      })
      inserted.push({ name: lead.name, crm_status: 'created', crm_id: contact.id })
    }
  }
  return inserted
}

// ── Run tracking helpers ──
async function createRun(clientId, config) {
  const { data, error } = await supabase.from('agent_runs').insert({
    client_id: clientId, agent_type: 'prospector', status: 'running', config,
    logs: JSON.stringify([{ time: new Date().toISOString(), type: 'info', msg: 'Iniciando busqueda multi-fuente...' }]),
  }).select('id').single()
  if (error) throw new Error('Failed to create run: ' + error.message)
  return data.id
}

async function updateRun(runId, updates) {
  await supabase.from('agent_runs').update(updates).eq('id', runId)
}

async function appendLog(runId, log) {
  const { data } = await supabase.from('agent_runs').select('logs').eq('id', runId).single()
  const logs = JSON.parse(data?.logs || '[]')
  logs.push({ time: new Date().toISOString(), ...log })
  await supabase.from('agent_runs').update({ logs: JSON.stringify(logs) }).eq('id', runId)
}

// ── Prospector request handler ──
async function handleProspector(req, res) {
  const { action, clientSlug, config } = req.body
  const clientId = await resolveClientId(clientSlug || 'black-wolf')
  if (!clientId) return res.status(400).json({ error: 'Client not found' })

  try {
    switch (action) {
      case 'search': {
        const { query = 'fabricas textiles', countries = ['Espana', 'Portugal', 'Italia', 'Francia', 'Alemania'], maxPerCountry = 10 } = config || {}
        const runId = await createRun(clientId, { query, countries, maxPerCountry })
        let allLeads = [], allEnrichments = []

        for (let ci = 0; ci < countries.length; ci++) {
          const country = countries[ci]
          if (ci > 0) await new Promise(r => setTimeout(r, 2000))

          await appendLog(runId, { type: 'info', msg: `[${ci + 1}/${countries.length}] Buscando en ${country} (OSM + Europages + Nominatim)...` })
          try {
            const places = await searchBusinesses(country, maxPerCountry)
            await appendLog(runId, { type: 'success', msg: `${places.length} empresas encontradas en ${country}` })

            if (places.length > 0) {
              await appendLog(runId, { type: 'info', msg: `Enriqueciendo ${places.length} empresas con IA (CEO, emails, LinkedIn)...` })
              const enrichments = await enrichWithAI(places)
              await appendLog(runId, { type: 'success', msg: `IA completada para ${country}` })
              allLeads.push(...places)
              allEnrichments.push(...enrichments)
            }
          } catch (err) {
            await appendLog(runId, { type: 'error', msg: `Error en ${country}: ${err.message}` })
          }
        }

        await appendLog(runId, { type: 'info', msg: `Insertando ${allLeads.length} leads en CRM BlackWolf...` })
        const results = await insertLeadsIntoCRM(clientId, allLeads, allEnrichments, runId)
        const created = results.filter(r => r.crm_status === 'created').length
        const duplicates = results.filter(r => r.crm_status === 'duplicate').length
        const errors = results.filter(r => r.crm_status === 'error').length

        await appendLog(runId, { type: 'success', msg: `Completado: ${created} nuevos, ${duplicates} duplicados, ${errors} errores` })
        await updateRun(runId, {
          status: 'completed',
          results_summary: JSON.stringify({ total_found: allLeads.length, created, duplicates, errors, countries_searched: countries }),
          completed_at: new Date().toISOString(),
        })
        return res.status(200).json({ runId, total: allLeads.length, created, duplicates, errors, leads: results })
      }

      case 'enrich': {
        const { data: leads } = await supabase.from('crm_contacts').select('*')
          .eq('client_id', clientId).eq('source', 'Agente Prospector').ilike('name', '%Director%').limit(config?.limit || 50)
        if (!leads || leads.length === 0) return res.status(200).json({ message: 'No leads to enrich', count: 0 })

        const companies = leads.map(l => ({
          name: l.company, address: l.address || '', country: l.country || '', website: l.website || '',
        }))
        const enrichments = await enrichWithAI(companies)
        let updated = 0
        for (let i = 0; i < leads.length; i++) {
          const e = enrichments[i]
          if (!e || !e.estimated_ceo || e.estimated_ceo === 'No disponible') continue
          await supabase.from('crm_contacts').update({
            name: e.estimated_ceo,
            position: e.ceo_title || leads[i].position,
            email: e.contact_emails?.[0] || leads[i].email,
            phone: e.phone_guess || leads[i].phone,
            website: e.website_guess || leads[i].website,
            linkedin: e.linkedin_search_url || leads[i].linkedin,
          }).eq('id', leads[i].id)
          updated++
        }
        return res.status(200).json({ message: `${updated} leads enriched`, count: updated })
      }

      case 'status': {
        const { runId } = config || {}
        if (!runId) return res.status(400).json({ error: 'runId required' })
        const { data: run } = await supabase.from('agent_runs').select('*').eq('id', runId).single()
        if (!run) return res.status(404).json({ error: 'Run not found' })
        return res.status(200).json({
          ...run, logs: JSON.parse(run.logs || '[]'),
          results_summary: run.results_summary ? JSON.parse(run.results_summary) : null,
          config: run.config ? (typeof run.config === 'string' ? JSON.parse(run.config) : run.config) : null,
        })
      }

      case 'history': {
        const { data: runs } = await supabase.from('agent_runs')
          .select('id, agent_type, status, results_summary, created_at, completed_at')
          .eq('client_id', clientId).eq('agent_type', 'prospector')
          .order('created_at', { ascending: false }).limit(20)
        return res.status(200).json({
          runs: (runs || []).map(r => ({ ...r, results_summary: r.results_summary ? JSON.parse(r.results_summary) : null })),
        })
      }

      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Prospector error:', error)
    return res.status(500).json({ error: error.message })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS AGENT — Claude-powered dashboard analysis
// ═══════════════════════════════════════════════════════════════════════════════

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Route: if body has 'action', it's the prospector agent
  const { action } = req.body
  if (action) {
    try {
      return await handleProspector(req, res)
    } catch (error) {
      console.error('Prospector error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // Otherwise: analytics agent
  const { question, history, clientSlug } = req.body
  if (!question) {
    return res.status(400).json({ error: 'question is required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const clientId = await resolveClientId(clientSlug)
  if (!clientId) {
    return res.status(400).json({ error: 'clientSlug is required' })
  }

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
    const response = await anthropic.messages.create({
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
