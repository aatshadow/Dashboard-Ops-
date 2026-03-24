// POST /api/agent — Unified AI agent
// Two modes:
//   1. Analytics: { question, history, clientSlug } — Claude-powered dashboard analytics
//   2. Prospector: { action, clientSlug, config } — Google Maps lead search + CRM insert

import Anthropic from '@anthropic-ai/sdk'
import { supabase, resolveClientId } from './lib/supabase.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ═══════════════════════════════════════════════════════════════════════════════
// PROSPECTOR AGENT — Enterprise-grade multi-source lead generation
// Sources: OpenCorporates, Europages, OpenStreetMap, Nominatim
// Enrichment: Claude AI → CEO, LinkedIn, emails, phone, revenue estimate
// ═══════════════════════════════════════════════════════════════════════════════

const COUNTRY_CODES = {
  'Espana': 'ES', 'Portugal': 'PT', 'Italia': 'IT', 'Francia': 'FR', 'Alemania': 'DE',
  'Reino Unido': 'GB', 'Paises Bajos': 'NL', 'Belgica': 'BE', 'Polonia': 'PL', 'Turquia': 'TR',
  'Rumania': 'RO', 'Republica Checa': 'CZ', 'Austria': 'AT', 'Suiza': 'CH', 'Suecia': 'SE',
  'Bulgaria': 'BG',
}

// OpenCorporates jurisdiction codes
const OC_JURISDICTIONS = {
  'Espana': 'es', 'Portugal': 'pt', 'Italia': 'it', 'Francia': 'fr', 'Alemania': 'de',
  'Reino Unido': 'gb', 'Paises Bajos': 'nl', 'Belgica': 'be', 'Polonia': 'pl', 'Turquia': 'tr',
  'Rumania': 'ro', 'Republica Checa': 'cz', 'Austria': 'at', 'Suiza': 'ch', 'Suecia': 'se',
  'Bulgaria': 'bg',
}

const COUNTRY_NAMES_EN = {
  'Espana': 'Spain', 'Portugal': 'Portugal', 'Italia': 'Italy', 'Francia': 'France',
  'Alemania': 'Germany', 'Reino Unido': 'United Kingdom', 'Paises Bajos': 'Netherlands',
  'Belgica': 'Belgium', 'Polonia': 'Poland', 'Turquia': 'Turkey', 'Rumania': 'Romania',
  'Republica Checa': 'Czech Republic', 'Austria': 'Austria', 'Suiza': 'Switzerland',
  'Suecia': 'Sweden', 'Bulgaria': 'Bulgaria',
}

// NACE codes for textile sector
const TEXTILE_NACE = ['13', '13.1', '13.2', '13.3', '13.9', '14', '14.1', '14.2', '14.3']

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 1: OpenCorporates — Business registry data (free, no API key)
// Returns: company name, registration number, address, jurisdiction, officers
// ═══════════════════════════════════════════════════════════════════════════════
// OpenCorporates requires API token now — skip gracefully
async function searchOpenCorporates(country, maxResults) {
  const apiToken = process.env.OPENCORPORATES_TOKEN
  if (!apiToken) return [] // No token = skip this source silently

  const jurisdiction = OC_JURISDICTIONS[country]
  if (!jurisdiction) return []

  const searchTerms = ['textile', 'textil', 'fabric']
  const results = []
  const seen = new Set()

  for (const term of searchTerms) {
    if (results.length >= maxResults) break
    try {
      const params = new URLSearchParams({
        q: term, jurisdiction_code: jurisdiction,
        per_page: String(Math.min(30, maxResults)),
        api_token: apiToken,
      })
      const resp = await fetch(`https://api.opencorporates.com/v0.4/companies/search?${params}`)
      if (!resp.ok) continue
      const data = await resp.json()

      for (const item of (data?.results?.companies || [])) {
        if (results.length >= maxResults) break
        const c = item.company || {}
        const name = c.name || ''
        if (!name || seen.has(name.toLowerCase()) || c.inactive || c.dissolution_date) continue
        seen.add(name.toLowerCase())

        const officers = (c.officers || []).map(o => o.officer || {})
        const director = officers.find(o => /director|admin|gerente|ceo|president/i.test(o.position || ''))

        results.push({
          name, source_type: 'OpenCorporates',
          company_number: c.company_number || '',
          address: c.registered_address_in_full || '',
          city: c.registered_address?.locality || '', country,
          jurisdiction: c.jurisdiction_code || jurisdiction,
          incorporation_date: c.incorporation_date || '',
          company_type: c.company_type || '', status: c.current_status || '',
          registry_url: c.opencorporates_url || '',
          director_name: director?.name || '', director_position: director?.position || '',
          phone: '', email: '', website: '', lat: '', lng: '', maps_url: '',
        })
      }
      await new Promise(r => setTimeout(r, 500))
    } catch {}
  }
  return results
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 2: Europages — European B2B directory
// ═══════════════════════════════════════════════════════════════════════════════
async function searchEuropages(country, maxResults) {
  const countryEn = COUNTRY_NAMES_EN[country] || country
  const results = []

  try {
    const url = `https://www.europages.co.uk/companies/textile%20manufacturer/${countryEn.toLowerCase().replace(/\s+/g, '-')}.html`
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    })
    if (!resp.ok) return []
    const html = await resp.text()

    const seen = new Set()
    // Try structured data first
    const nameMatches = html.match(/data-company-name="([^"]+)"/gi) || []
    for (const match of nameMatches) {
      if (results.length >= maxResults) break
      const name = match.replace(/data-company-name="/, '').replace(/"$/, '').trim()
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())
      results.push({
        name, source_type: 'Europages',
        company_number: '', address: '', city: '', country,
        jurisdiction: '', incorporation_date: '', company_type: '',
        status: 'active', registry_url: '',
        director_name: '', director_position: '',
        phone: '', email: '', website: '',
        lat: '', lng: '', maps_url: '',
      })
    }

    // Fallback: h3 headings
    if (results.length === 0) {
      const h3s = html.match(/<h[23][^>]*>([^<]{4,80})<\/h[23]>/gi) || []
      for (const h of h3s) {
        if (results.length >= maxResults) break
        const name = h.replace(/<\/?h[23][^>]*>/gi, '').trim()
        if (!name || name.length < 4 || seen.has(name.toLowerCase())) continue
        if (/search|filter|result|page|textile manufacturer|companies/i.test(name)) continue
        seen.add(name.toLowerCase())
        results.push({
          name, source_type: 'Europages',
          company_number: '', address: '', city: '', country,
          jurisdiction: '', incorporation_date: '', company_type: '',
          status: '', registry_url: '',
          director_name: '', director_position: '',
          phone: '', email: '', website: '',
          lat: '', lng: '', maps_url: '',
        })
      }
    }
  } catch {}

  return results
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 3: OpenStreetMap Overpass (lightweight tag search)
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED SEARCH — All sources in parallel, deduplicated, merged
// Priority: OpenCorporates (official data) > Europages (B2B) > OSM > Nominatim
// ═══════════════════════════════════════════════════════════════════════════════
async function searchBusinesses(country, maxResults = 20) {
  // Run all sources in parallel
  const [ocResults, epResults, osmResults] = await Promise.all([
    searchOpenCorporates(country, maxResults).catch(() => []),
    searchEuropages(country, Math.ceil(maxResults / 2)).catch(() => []),
    searchOverpass(country, Math.ceil(maxResults / 2)).catch(() => []),
  ])

  // Merge with deduplication — OpenCorporates first (best data quality)
  const seen = new Set()
  const all = []

  for (const r of [...ocResults, ...epResults, ...osmResults]) {
    if (all.length >= maxResults) break
    const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!key || seen.has(key)) continue
    seen.add(key)
    all.push(r)
  }

  // Fill with Nominatim if needed
  if (all.length < maxResults) {
    const nomResults = await searchNominatim(country, maxResults - all.length).catch(() => [])
    for (const r of nomResults) {
      if (all.length >= maxResults) break
      const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!key || seen.has(key)) continue
      seen.add(key)
      all.push(r)
    }
  }

  return all
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI ENRICHMENT — Claude finds CEO, LinkedIn, emails, phones, revenue
// ═══════════════════════════════════════════════════════════════════════════════
async function enrichWithAI(companies) {
  if (!companies.length) return []

  const companySummaries = companies.map((c, i) => {
    const parts = [`${i + 1}. "${c.name}" — ${c.country}`]
    if (c.address) parts.push(`Dir: ${c.address}`)
    if (c.website) parts.push(`Web: ${c.website}`)
    if (c.phone) parts.push(`Tel: ${c.phone}`)
    if (c.company_number) parts.push(`Reg: ${c.company_number}`)
    if (c.director_name) parts.push(`Director conocido: ${c.director_name} (${c.director_position || ''})`)
    if (c.incorporation_date) parts.push(`Fundada: ${c.incorporation_date}`)
    if (c.registry_url) parts.push(`Registro: ${c.registry_url}`)
    return parts.join(' | ')
  }).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: `Eres un agente de inteligencia comercial B2B de nivel enterprise especializado en el sector textil europeo.

TU MISION: Para cada empresa, debes encontrar/deducir la maxima informacion de contacto posible para que un equipo de ventas pueda contactar al CEO/Director directamente.

REGLAS DE BUSQUEDA:
1. CEO/DIRECTOR: Si se proporciona un director conocido del registro mercantil, usalo. Si no, deduce el nombre mas probable segun el pais y tipo de empresa.

2. LINKEDIN DEL CEO: Genera la URL EXACTA de busqueda en LinkedIn:
   https://www.linkedin.com/search/results/people/?keywords=NOMBRE%20APELLIDO%20EMPRESA&origin=GLOBAL_SEARCH_HEADER

3. LINKEDIN DE LA EMPRESA: Genera la URL probable:
   https://www.linkedin.com/company/nombre-empresa/

4. TELEFONO DEL CEO: Si hay telefono de empresa, usa ese. Si no, genera formato del pais:
   ES: +34 9XX XXX XXX | IT: +39 0XX XXX XXXX | FR: +33 X XX XX XX XX | DE: +49 XXX XXXXXXX | PT: +351 XXX XXX XXX | UK: +44 XXXX XXXXXX | BG: +359 X XXX XXXX

5. TELEFONO EMPRESA: Usa el que venga de los datos o genera uno probable.

6. EMAILS: Genera MULTIPLES emails probables:
   - info@dominio.com, contacto@dominio.com, direccion@dominio.com
   - nombre.apellido@dominio.com (del CEO)
   - Si no hay web: info@nombreempresa.com, contacto@nombreempresa.es (segun pais)

7. FACTURACION ESTIMADA: Basandote en:
   - Tipo de empresa (SL, SA, SRL, GmbH, Ltd, etc.)
   - Fecha de fundacion (mas antigua = mas grande normalmente)
   - Sector especifico (fabricante > distribuidor > tienda)
   - Pais y region
   Estima facturacion anual en euros.

8. SECTOR: Clasifica especificamente: hilatura, tejeduria, confeccion, acabados textiles, fibras sinteticas, fibras naturales, maquinaria textil, distribucion textil, comercio textil

RESPONDE UNICAMENTE con JSON valido, sin texto antes ni despues.`,
    messages: [{
      role: 'user',
      content: `Analiza estas ${companies.length} empresas textiles y proporciona inteligencia comercial completa:

${companySummaries}

JSON array — cada elemento:
[{
  "index": 1,
  "ceo_name": "nombre completo del CEO/Director",
  "ceo_title": "CEO|Director General|Administrador|Gerente",
  "ceo_linkedin": "https://www.linkedin.com/search/results/people/?keywords=...",
  "ceo_phone": "+XX XXX XXX XXX",
  "ceo_email": "nombre@dominio.com",
  "company_linkedin": "https://www.linkedin.com/company/...",
  "company_phone": "+XX XXX XXX XXX",
  "company_emails": ["info@dominio.com", "contacto@dominio.com"],
  "company_website": "https://www.dominio.com",
  "estimated_revenue": "500K-2M EUR",
  "employee_count": "10-50",
  "company_size": "micro|pequena|mediana|grande",
  "sector_specific": "hilatura|tejeduria|confeccion|acabados|fibras|distribucion|comercio",
  "sector_tags": ["textil", "fabricacion", "tag3"],
  "nace_code": "13.XX",
  "commercial_notes": "observacion util para el equipo de ventas"
}]`
    }],
  })

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return companies.map(() => ({}))
  try { return JSON.parse(jsonMatch[0]) } catch { return companies.map(() => ({})) }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRM INSERT — Full field mapping (every field in its proper column)
// ═══════════════════════════════════════════════════════════════════════════════
async function insertLeadsIntoCRM(clientId, leads, enrichments, runId) {
  const inserted = []
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const ai = enrichments[i] || {}

    // Deduplicate
    const { data: existing } = await supabase
      .from('crm_contacts').select('id')
      .eq('client_id', clientId).eq('company', lead.name).limit(1)

    if (existing && existing.length > 0) {
      inserted.push({ name: lead.name, crm_status: 'duplicate', crm_id: existing[0].id })
      continue
    }

    const contactData = {
      client_id: clientId,
      // ── CEO/Director (persona de contacto) ──
      name: ai.ceo_name && ai.ceo_name !== 'No disponible' ? ai.ceo_name : (lead.director_name || `Director/a — ${lead.name}`),
      position: ai.ceo_title || lead.director_position || 'CEO / Director',
      // ── Empresa ──
      company: lead.name,
      // ── Contacto CEO (campos propios) ──
      email: ai.ceo_email || ai.company_emails?.[0] || lead.email || '',
      phone: ai.ceo_phone || ai.company_phone || lead.phone || '',
      // ── Empresa datos ──
      website: ai.company_website || lead.website || '',
      address: lead.address || '',
      country: lead.country || '',
      linkedin: ai.ceo_linkedin || ai.company_linkedin || '',
      // ── CRM metadata ──
      source: 'Agente Prospector',
      status: 'lead',
      tags: JSON.stringify([
        ...(ai.sector_tags || ['textil']),
        ai.sector_specific || 'textil',
        ai.company_size || '',
        lead.source_type || '',
        'prospector-agent',
      ].filter(Boolean)),
      // ── Notes: SOLO contexto extra, nunca datos de contacto ──
      notes: [
        ai.commercial_notes || '',
        ai.estimated_revenue ? `Facturacion estimada: ${ai.estimated_revenue}` : '',
        ai.employee_count ? `Empleados estimados: ${ai.employee_count}` : '',
        ai.nace_code ? `NACE: ${ai.nace_code}` : '',
        lead.company_number ? `Registro mercantil: ${lead.company_number}` : '',
        lead.incorporation_date ? `Fundada: ${lead.incorporation_date}` : '',
        lead.registry_url ? `Registro: ${lead.registry_url}` : '',
      ].filter(Boolean).join('\n') || '',
      // ── Custom fields: datos estructurados extra ──
      custom_fields: JSON.stringify({
        agent_run_id: runId,
        source_type: lead.source_type || '',
        // CEO
        ceo_name: ai.ceo_name || '',
        ceo_linkedin: ai.ceo_linkedin || '',
        ceo_phone: ai.ceo_phone || '',
        ceo_email: ai.ceo_email || '',
        // Empresa
        company_linkedin: ai.company_linkedin || '',
        company_phone: ai.company_phone || '',
        company_emails: ai.company_emails || [],
        company_website: ai.company_website || '',
        // Registro mercantil
        company_number: lead.company_number || '',
        jurisdiction: lead.jurisdiction || '',
        incorporation_date: lead.incorporation_date || '',
        company_type: lead.company_type || '',
        registry_url: lead.registry_url || '',
        // Sector
        sector_specific: ai.sector_specific || '',
        nace_code: ai.nace_code || '',
        estimated_revenue: ai.estimated_revenue || '',
        employee_count: ai.employee_count || '',
        company_size: ai.company_size || '',
        // Geo
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
      // Activity log with full intelligence report
      await supabase.from('crm_activities').insert({
        client_id: clientId, contact_id: contact.id, type: 'note',
        title: `Lead capturado — ${lead.source_type || 'Prospector'}`,
        description: [
          `Empresa: ${lead.name}`,
          `Pais: ${lead.country}`,
          `CEO: ${ai.ceo_name || 'Por identificar'}`,
          `Email CEO: ${ai.ceo_email || 'N/A'}`,
          `LinkedIn CEO: ${ai.ceo_linkedin || 'N/A'}`,
          `LinkedIn Empresa: ${ai.company_linkedin || 'N/A'}`,
          `Tel empresa: ${ai.company_phone || lead.phone || 'N/A'}`,
          `Web: ${ai.company_website || lead.website || 'N/A'}`,
          `Facturacion: ${ai.estimated_revenue || 'N/A'}`,
          `Sector: ${ai.sector_specific || 'textil'}`,
          `Fuente: ${lead.source_type}`,
          lead.registry_url ? `Registro: ${lead.registry_url}` : '',
        ].filter(Boolean).join('\n'),
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
    logs: JSON.stringify([{ time: new Date().toISOString(), type: 'info', msg: 'Iniciando busqueda en registros mercantiles, directorios B2B y mapas...' }]),
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

          await appendLog(runId, { type: 'info', msg: `[${ci + 1}/${countries.length}] Buscando en ${country} (OpenCorporates + Europages + OSM + Nominatim)...` })
          try {
            const places = await searchBusinesses(country, maxPerCountry)
            await appendLog(runId, { type: 'success', msg: `${places.length} empresas encontradas en ${country}` })

            if (places.length > 0) {
              await appendLog(runId, { type: 'info', msg: `Enriqueciendo ${places.length} empresas con IA (CEO, LinkedIn, emails, telefono, facturacion)...` })
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
