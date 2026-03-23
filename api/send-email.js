// POST /api/send-email — API proxy (Resend + ManyChat) to avoid CORS
// Actions:
//   { action: "send-emails", resendApiKey, emails }
//   { action: "manychat", apiKey, endpoint, method, body }
//   Legacy: { resendApiKey, emails } (backwards compat)

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action } = req.body

    // ── ManyChat Proxy ──
    if (action === 'manychat') {
      const { apiKey, endpoint, method = 'GET', body } = req.body
      if (!apiKey) return res.status(400).json({ error: 'apiKey is required' })
      if (!endpoint) return res.status(400).json({ error: 'endpoint is required' })

      const url = `https://api.manychat.com${endpoint}`
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
      if (body && method !== 'GET') options.body = JSON.stringify(body)

      const response = await fetch(url, options)
      const data = await response.json()

      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || data.error || 'ManyChat API error', details: data })
      }
      return res.status(200).json(data)
    }

    // ── Resend Email Sending (default / legacy) ──
    const { resendApiKey, emails } = req.body
    if (!resendApiKey) return res.status(400).json({ error: 'resendApiKey is required' })
    if (!emails || !emails.length) return res.status(400).json({ error: 'emails array is required' })

    let sent = 0
    let failed = 0
    let lastError = null

    for (const email of emails) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(email),
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

    return res.status(200).json({ sent, failed, total: emails.length, lastError })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
