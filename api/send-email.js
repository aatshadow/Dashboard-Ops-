// POST /api/send-email — proxy to Resend API (avoids CORS)
// Frontend sends: { resendApiKey, emails: [{ from, to, subject, html }] }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { resendApiKey, emails } = req.body

    if (!resendApiKey) return res.status(400).json({ error: 'resendApiKey is required' })
    if (!emails || !emails.length) return res.status(400).json({ error: 'emails array is required' })

    let sent = 0
    let failed = 0
    let lastError = null

    // Send emails one by one for reliability
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
