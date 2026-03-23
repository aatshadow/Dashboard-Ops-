// POST /api/send-email — sends an email campaign via Resend

import { supabase, resolveClientId } from './lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { campaignId, clientSlug } = req.body
    if (!campaignId || !clientSlug) {
      return res.status(400).json({ error: 'campaignId and clientSlug are required' })
    }

    const clientId = await resolveClientId(clientSlug)
    if (!clientId) return res.status(400).json({ error: 'Client not found for slug: ' + clientSlug })

    // Get email config
    const { data: configs, error: configErr } = await supabase
      .from('email_config')
      .select('*')
      .eq('client_id', clientId)

    if (configErr) return res.status(500).json({ error: 'DB config error: ' + configErr.message })

    const config = configs && configs[0]
    if (!config || !config.api_key) {
      return res.status(400).json({ error: 'Configura tu API Key de Resend primero' })
    }

    // Get campaign
    const { data: campaigns, error: campErr } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)

    if (campErr) return res.status(500).json({ error: 'DB campaign error: ' + campErr.message })

    const campaign = campaigns && campaigns[0]
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada, id=' + campaignId + ', clientId=' + clientId })

    // Get subscribers
    let subs = []
    if (campaign.list_id) {
      const { data, error: subErr } = await supabase
        .from('email_subscribers')
        .select('*')
        .eq('list_id', campaign.list_id)
        .eq('status', 'subscribed')
      if (subErr) return res.status(500).json({ error: 'DB subscribers error: ' + subErr.message })
      subs = data || []
    } else {
      const { data, error: subErr } = await supabase
        .from('email_subscribers')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'subscribed')
      if (subErr) return res.status(500).json({ error: 'DB subscribers error: ' + subErr.message })
      subs = data || []
    }

    if (subs.length === 0) {
      return res.status(400).json({ error: 'No hay suscriptores en la lista seleccionada' })
    }

    const fromEmail = campaign.from_email || config.from_email || 'onboarding@resend.dev'
    const fromName = campaign.from_name || config.from_name || 'Newsletter'
    const htmlContent = campaign.html_content || '<p>Sin contenido</p>'

    let sent = 0
    let failed = 0
    let lastError = null

    // Send individually (batch endpoint needs array, single is more reliable)
    for (const sub of subs) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [sub.email],
            subject: campaign.subject || '(Sin asunto)',
            html: htmlContent
              .replace(/\{\{name\}\}/g, sub.name || 'Suscriptor')
              .replace(/\{\{email\}\}/g, sub.email),
          }),
        })

        if (response.ok) {
          sent++
        } else {
          const err = await response.json()
          lastError = err.message || JSON.stringify(err)
          failed++
        }
      } catch (e) {
        lastError = e.message
        failed++
      }
    }

    // Update campaign stats
    await supabase.from('email_campaigns').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_sent: sent,
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId)

    const result = { sent, failed, total: subs.length }
    if (lastError) result.lastError = lastError
    return res.status(200).json(result)
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack })
  }
}
