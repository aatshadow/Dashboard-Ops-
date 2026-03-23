// POST /api/send-email — sends an email campaign via Resend

import { supabase, resolveClientId } from './lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { campaignId, clientSlug } = req.body
    const clientId = await resolveClientId(clientSlug)
    if (!clientId) return res.status(400).json({ error: 'clientSlug is required' })

    // Get email config
    const { data: config } = await supabase
      .from('email_config')
      .select('*')
      .eq('client_id', clientId)
      .limit(1)
      .single()

    if (!config || !config.api_key) {
      return res.status(400).json({ error: 'Configura tu API Key de Resend primero' })
    }

    // Get campaign
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })

    // Get subscribers
    let subs = []
    if (campaign.list_id) {
      const { data } = await supabase
        .from('email_subscribers')
        .select('*')
        .eq('list_id', campaign.list_id)
        .eq('status', 'subscribed')
      subs = data || []
    } else {
      const { data } = await supabase
        .from('email_subscribers')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'subscribed')
      subs = data || []
    }

    if (subs.length === 0) {
      return res.status(400).json({ error: 'No hay suscriptores en la lista seleccionada' })
    }

    const fromEmail = campaign.from_email || config.from_email || 'onboarding@resend.dev'
    const fromName = campaign.from_name || config.from_name || 'Newsletter'

    let sent = 0
    let failed = 0

    // Send in batches of 50
    for (let i = 0; i < subs.length; i += 50) {
      const batch = subs.slice(i, i + 50)
      const emails = batch.map(sub => ({
        from: `${fromName} <${fromEmail}>`,
        to: [sub.email],
        subject: campaign.subject || '(Sin asunto)',
        html: (campaign.html_content || '')
          .replace(/\{\{name\}\}/g, sub.name || 'Suscriptor')
          .replace(/\{\{email\}\}/g, sub.email),
      }))

      try {
        const response = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emails),
        })

        if (response.ok) {
          sent += batch.length
        } else {
          const err = await response.json()
          console.error('Resend error:', err)
          failed += batch.length
        }
      } catch (e) {
        console.error('Send error:', e)
        failed += batch.length
      }
    }

    // Update campaign stats
    await supabase.from('email_campaigns').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_sent: sent,
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId)

    return res.status(200).json({ sent, failed, total: subs.length })
  } catch (e) {
    console.error('Send campaign error:', e)
    return res.status(500).json({ error: e.message })
  }
}
