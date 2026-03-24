// POST /api/agent-prospector — AI Prospecting Agent
// Searches Google Maps for businesses, enriches with AI, and inserts into CRM
//
// Actions:
//   search   — Search Google Maps and insert leads into CRM
//   enrich   — Use AI to find CEO/decision-maker for existing leads
//   status   — Get run status and results
//   history  — Get past runs

import Anthropic from '@anthropic-ai/sdk'
import { supabase, resolveClientId } from './lib/supabase.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Google Places API Text Search ──────────────────────────────────────────────
async function searchGoogleMaps(query, country, maxResults = 20) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured')

  const results = []
  let nextPageToken = null

  // Google Places returns max 20 per page, up to 60 total (3 pages)
  const maxPages = Math.ceil(maxResults / 20)

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      query: `${query} in ${country}`,
      key: apiKey,
      language: 'es',
    })
    if (nextPageToken) {
      params.set('pagetoken', nextPageToken)
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Google Maps API error: ${resp.status}`)

    const data = await resp.json()
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API status: ${data.status} — ${data.error_message || ''}`)
    }

    for (const place of (data.results || [])) {
      if (results.length >= maxResults) break
      results.push({
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address || '',
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        rating: place.rating || null,
        total_ratings: place.user_ratings_total || 0,
        types: place.types || [],
        business_status: place.business_status || '',
      })
    }

    nextPageToken = data.next_page_token
    if (!nextPageToken || results.length >= maxResults) break

    // Google requires a short delay before using next_page_token
    await new Promise(r => setTimeout(r, 2000))
  }

  return results
}

// ─── Get Place Details (phone, website) ─────────────────────────────────────────
async function getPlaceDetails(placeId) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'formatted_phone_number,international_phone_number,website,url,name,opening_hours',
    key: apiKey,
    language: 'es',
  })

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  const resp = await fetch(url)
  if (!resp.ok) return {}

  const data = await resp.json()
  if (data.status !== 'OK') return {}

  return {
    phone: data.result?.international_phone_number || data.result?.formatted_phone_number || '',
    website: data.result?.website || '',
    maps_url: data.result?.url || '',
  }
}

// ─── AI Enrichment: Find CEO from company info ─────────────────────────────────
async function enrichWithAI(companies) {
  if (!companies.length) return []

  const companySummaries = companies.map((c, i) =>
    `${i + 1}. "${c.name}" — ${c.address}${c.website ? ` — Web: ${c.website}` : ''}`
  ).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `Eres un agente de investigacion empresarial. Tu trabajo es analizar empresas y deducir informacion util para contacto comercial B2B.

INSTRUCCIONES:
1. Para cada empresa, proporciona tu mejor estimacion del CEO/Director/Gerente basandote en el nombre de la empresa, su ubicacion y sector
2. Si la empresa tiene website, sugiere donde buscar la pagina "Equipo", "About Us", "Quienes Somos" o similar
3. Genera un email de contacto probable basado en el dominio web (formato: info@dominio.com, contacto@dominio.com, direccion@dominio.com)
4. Clasifica el tamano estimado de la empresa (micro, pequena, mediana, grande)
5. Responde SIEMPRE en formato JSON valido`,
    messages: [{
      role: 'user',
      content: `Analiza estas empresas textiles/fabricas y proporciona informacion de contacto estimada para cada una.

EMPRESAS:
${companySummaries}

Responde con un JSON array donde cada elemento tenga:
{
  "index": numero (1-based),
  "estimated_ceo": "nombre estimado o 'No disponible'",
  "ceo_title": "CEO/Director/Gerente General",
  "contact_emails": ["email1@dominio.com", "email2@dominio.com"],
  "linkedin_search_url": "URL de busqueda en LinkedIn para encontrar al CEO",
  "company_size": "micro|pequena|mediana|grande",
  "sector_tags": ["textil", "fabricacion", ...],
  "notes": "cualquier observacion util para el equipo comercial"
}`
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return companies.map(() => ({}))

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return companies.map(() => ({}))
  }
}

// ─── Insert leads into CRM ─────────────────────────────────────────────────────
async function insertLeadsIntoCRM(clientId, leads, enrichments, runId) {
  const inserted = []

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const enrichment = enrichments[i] || {}

    // Check for duplicate by company name + address
    const { data: existing } = await supabase
      .from('crm_contacts')
      .select('id')
      .eq('client_id', clientId)
      .eq('company', lead.name)
      .limit(1)

    if (existing && existing.length > 0) {
      inserted.push({ ...lead, crm_status: 'duplicate', crm_id: existing[0].id })
      continue
    }

    const contactData = {
      client_id: clientId,
      name: enrichment.estimated_ceo && enrichment.estimated_ceo !== 'No disponible'
        ? enrichment.estimated_ceo
        : `Director/a — ${lead.name}`,
      email: enrichment.contact_emails?.[0] || '',
      phone: lead.phone || '',
      company: lead.name,
      position: enrichment.ceo_title || 'CEO / Director',
      country: extractCountry(lead.address),
      source: 'Google Maps',
      status: 'lead',
      tags: JSON.stringify(enrichment.sector_tags || ['textil', 'fabrica', 'prospection-agent']),
      notes: [
        `Direccion: ${lead.address}`,
        lead.website ? `Web: ${lead.website}` : '',
        lead.maps_url ? `Maps: ${lead.maps_url}` : '',
        lead.rating ? `Rating: ${lead.rating}/5 (${lead.total_ratings} resenas)` : '',
        enrichment.notes || '',
        enrichment.linkedin_search_url ? `LinkedIn Search: ${enrichment.linkedin_search_url}` : '',
        `Tamano estimado: ${enrichment.company_size || 'desconocido'}`,
        `Agente Run: ${runId}`,
      ].filter(Boolean).join('\n'),
      custom_fields: JSON.stringify({
        google_place_id: lead.place_id,
        website: lead.website || '',
        maps_url: lead.maps_url || '',
        rating: lead.rating,
        total_ratings: lead.total_ratings,
        company_size: enrichment.company_size || '',
        agent_run_id: runId,
        contact_emails: enrichment.contact_emails || [],
        linkedin_search: enrichment.linkedin_search_url || '',
      }),
      deal_value: 0,
    }

    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .insert(contactData)
      .select('id')
      .single()

    if (error) {
      console.error('CRM insert error:', error)
      inserted.push({ ...lead, crm_status: 'error', error: error.message })
    } else {
      // Log an activity for the new lead
      await supabase.from('crm_activities').insert({
        client_id: clientId,
        contact_id: contact.id,
        type: 'note',
        title: 'Lead capturado por Agente Prospector',
        description: `Encontrado en Google Maps: "${lead.name}"\nDireccion: ${lead.address}\n${lead.website ? `Web: ${lead.website}` : ''}`,
        performed_by: 'AI Agent',
      })

      inserted.push({ ...lead, crm_status: 'created', crm_id: contact.id })
    }
  }

  return inserted
}

// ─── Extract country from address ───────────────────────────────────────────────
function extractCountry(address) {
  if (!address) return ''
  const parts = address.split(',').map(p => p.trim())
  return parts[parts.length - 1] || ''
}

// ─── Save agent run ─────────────────────────────────────────────────────────────
async function createRun(clientId, config) {
  const { data, error } = await supabase
    .from('agent_runs')
    .insert({
      client_id: clientId,
      agent_type: 'prospector',
      status: 'running',
      config,
      logs: JSON.stringify([{ time: new Date().toISOString(), type: 'info', msg: 'Iniciando busqueda...' }]),
    })
    .select('id')
    .single()

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

// ─── Main Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, clientSlug, config } = req.body

  const clientId = await resolveClientId(clientSlug || 'black-wolf')
  if (!clientId) return res.status(400).json({ error: 'Client not found' })

  try {
    switch (action) {
      case 'search': {
        const {
          query = 'fabricas textiles',
          countries = ['Espana', 'Portugal', 'Italia', 'Francia', 'Alemania'],
          maxPerCountry = 10,
        } = config || {}

        // Create run
        const runId = await createRun(clientId, { query, countries, maxPerCountry })

        let allLeads = []
        let allEnrichments = []

        for (const country of countries) {
          await appendLog(runId, { type: 'info', msg: `Buscando "${query}" en ${country}...` })

          try {
            // Search Google Maps
            const places = await searchGoogleMaps(query, country, maxPerCountry)
            await appendLog(runId, { type: 'success', msg: `${places.length} resultados encontrados en ${country}` })

            // Get details (phone, website) for each place
            const enrichedPlaces = []
            for (const place of places) {
              try {
                const details = await getPlaceDetails(place.place_id)
                enrichedPlaces.push({ ...place, ...details })
              } catch {
                enrichedPlaces.push(place)
              }
            }

            await appendLog(runId, { type: 'info', msg: `Enriqueciendo ${enrichedPlaces.length} empresas de ${country} con IA...` })

            // AI enrichment
            const enrichments = await enrichWithAI(enrichedPlaces)
            await appendLog(runId, { type: 'success', msg: `IA completo para ${country}` })

            allLeads.push(...enrichedPlaces)
            allEnrichments.push(...enrichments)
          } catch (err) {
            await appendLog(runId, { type: 'error', msg: `Error en ${country}: ${err.message}` })
          }
        }

        // Insert into CRM
        await appendLog(runId, { type: 'info', msg: `Insertando ${allLeads.length} leads en CRM de BlackWolf...` })
        const results = await insertLeadsIntoCRM(clientId, allLeads, allEnrichments, runId)

        const created = results.filter(r => r.crm_status === 'created').length
        const duplicates = results.filter(r => r.crm_status === 'duplicate').length
        const errors = results.filter(r => r.crm_status === 'error').length

        await appendLog(runId, {
          type: 'success',
          msg: `Completado: ${created} nuevos leads, ${duplicates} duplicados, ${errors} errores`,
        })

        await updateRun(runId, {
          status: 'completed',
          results_summary: JSON.stringify({
            total_found: allLeads.length,
            created,
            duplicates,
            errors,
            countries_searched: countries,
          }),
          completed_at: new Date().toISOString(),
        })

        return res.status(200).json({
          runId,
          total: allLeads.length,
          created,
          duplicates,
          errors,
          leads: results,
        })
      }

      case 'enrich': {
        // Re-enrich existing leads that don't have CEO info
        const { data: leads } = await supabase
          .from('crm_contacts')
          .select('*')
          .eq('client_id', clientId)
          .eq('source', 'Google Maps')
          .ilike('name', '%Director%')
          .limit(config?.limit || 50)

        if (!leads || leads.length === 0) {
          return res.status(200).json({ message: 'No leads to enrich', count: 0 })
        }

        const companies = leads.map(l => ({
          name: l.company,
          address: l.notes?.match(/Direccion: (.+)/)?.[1] || '',
          website: (() => {
            try {
              const cf = JSON.parse(l.custom_fields || '{}')
              return cf.website || ''
            } catch { return '' }
          })(),
        }))

        const enrichments = await enrichWithAI(companies)

        let updated = 0
        for (let i = 0; i < leads.length; i++) {
          const enrichment = enrichments[i]
          if (!enrichment || !enrichment.estimated_ceo || enrichment.estimated_ceo === 'No disponible') continue

          await supabase
            .from('crm_contacts')
            .update({
              name: enrichment.estimated_ceo,
              position: enrichment.ceo_title || leads[i].position,
              email: enrichment.contact_emails?.[0] || leads[i].email,
            })
            .eq('id', leads[i].id)

          updated++
        }

        return res.status(200).json({ message: `${updated} leads enriched`, count: updated })
      }

      case 'status': {
        const { runId } = config || {}
        if (!runId) return res.status(400).json({ error: 'runId required' })

        const { data: run } = await supabase
          .from('agent_runs')
          .select('*')
          .eq('id', runId)
          .single()

        if (!run) return res.status(404).json({ error: 'Run not found' })

        return res.status(200).json({
          ...run,
          logs: JSON.parse(run.logs || '[]'),
          results_summary: run.results_summary ? JSON.parse(run.results_summary) : null,
          config: run.config ? (typeof run.config === 'string' ? JSON.parse(run.config) : run.config) : null,
        })
      }

      case 'history': {
        const { data: runs } = await supabase
          .from('agent_runs')
          .select('id, agent_type, status, results_summary, created_at, completed_at')
          .eq('client_id', clientId)
          .eq('agent_type', 'prospector')
          .order('created_at', { ascending: false })
          .limit(20)

        return res.status(200).json({
          runs: (runs || []).map(r => ({
            ...r,
            results_summary: r.results_summary ? JSON.parse(r.results_summary) : null,
          })),
        })
      }

      default:
        return res.status(400).json({ error: 'Invalid action. Use: search, enrich, status, history' })
    }
  } catch (error) {
    console.error('Prospector error:', error)
    return res.status(500).json({ error: error.message })
  }
}
