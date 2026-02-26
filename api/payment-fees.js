// GET    /api/payment-fees  — list all payment fees
// POST   /api/payment-fees  — create a payment fee
// PUT    /api/payment-fees  — update a payment fee
// DELETE /api/payment-fees  — delete a payment fee

import { supabase, toDbFormat, toAppFormat } from './lib/supabase.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ── GET: List payment fees ──
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('payment_fees').select('*').order('method')
      if (error) return res.status(500).json({ error: error.message })

      const fees = (data || []).map(f => toAppFormat(f, 'payment_fees'))
      return res.status(200).json({ fees, count: fees.length })
    } catch (err) {
      console.error('GET /api/payment-fees error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── POST: Create payment fee ──
  if (req.method === 'POST') {
    try {
      const fee = req.body
      if (!fee.method) {
        return res.status(400).json({ error: 'method is required' })
      }

      const dbFee = toDbFormat(fee, 'payment_fees')
      const { data, error } = await supabase.from('payment_fees').insert(dbFee).select()
      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'A fee for this method already exists' })
        }
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json({ success: true, fee: toAppFormat(data[0], 'payment_fees') })
    } catch (err) {
      console.error('POST /api/payment-fees error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── PUT: Update payment fee ──
  if (req.method === 'PUT') {
    try {
      const { id, ...updates } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })

      const dbUpdates = toDbFormat(updates, 'payment_fees')
      const { data, error } = await supabase.from('payment_fees').update(dbUpdates).eq('id', id).select()
      if (error) return res.status(500).json({ error: error.message })
      if (!data || data.length === 0) return res.status(404).json({ error: 'Fee not found' })

      return res.status(200).json({ success: true, fee: toAppFormat(data[0], 'payment_fees') })
    } catch (err) {
      console.error('PUT /api/payment-fees error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── DELETE: Delete payment fee ──
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id query param required' })

      const { error } = await supabase.from('payment_fees').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('DELETE /api/payment-fees error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
