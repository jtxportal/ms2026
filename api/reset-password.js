// api/reset-password.js
// Admin resetuje heslo hráče na výchozí "chytrak".
// POST /api/reset-password   { targetId }
// Hlavička: Authorization: Bearer <access_token přihlášeného admina>
// Vyžaduje: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'

const DEFAULT_PASSWORD = 'chytrak'

const admin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  // 1) Ověřit, že volá přihlášený uživatel
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Chybí přihlášení' })
  }

  const { data: caller, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !caller?.user) {
    return res.status(401).json({ error: 'Neplatné přihlášení' })
  }

  // 2) Ověřit, že volající je admin
  const { data: profile } = await admin
    .from('profiles')
    .select('je_admin')
    .eq('id', caller.user.id)
    .single()

  if (!profile?.je_admin) {
    return res.status(403).json({ error: 'Jen pro admina' })
  }

  // 3) Reset hesla cílového hráče
  const { targetId } = req.body || {}
  if (!targetId) {
    return res.status(400).json({ error: 'Chybí targetId' })
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(targetId, {
    password: DEFAULT_PASSWORD,
  })
  if (updErr) {
    return res.status(500).json({ error: updErr.message })
  }

  return res.status(200).json({ ok: true, password: DEFAULT_PASSWORD })
}
