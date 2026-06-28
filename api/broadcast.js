// api/broadcast.js
// JEDNORÁZOVÁ hromadná SMS všem hráčům s vyplněným telefonem.
// Spuštění z prohlížeče:  /api/broadcast?secret=<CRON_SECRET>
//   volitelně vlastní text:  &msg=<URL-enkódovaný text>
//   volitelně jen ti, co mají zapnuté SMS:  &onlyOptedIn=1
// Vrací seznam, komu to odešlo. Twilio nastavení 1:1 jako notify.js.

import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const DEFAULT_MSG =
  'Tipovacka MS2026: Uz jsou v nabidce vyrazovaci zapasy (sestnactifinale)! Prvni vykop uz za chvili - stihni svuj tip: ms2026-phi.vercel.app'

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  const FROM = process.env.TWILIO_FROM_NUMBER

  const msg = (req.query.msg && String(req.query.msg).trim()) || DEFAULT_MSG

  // Hráči s telefonem (volitelně jen ti se zapnutými SMS)
  let q = supabase.from('profiles')
    .select('prezdivka, telefon, notify_whatsapp')
    .not('telefon', 'is', null).neq('telefon', '')
  if (req.query.onlyOptedIn === '1') q = q.eq('notify_whatsapp', true)

  const { data: profiles, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  if (!profiles || profiles.length === 0) {
    return res.json({ sent: 0, message: 'Zadni hraci s telefonem' })
  }

  const sent = []
  const errors = []
  const seen = new Set()   // deduplikace podle čísla

  for (const p of profiles) {
    let tel = String(p.telefon).replace(/\s/g, '')
    if (tel.startsWith('0')) tel = '+420' + tel.slice(1)
    if (!tel.startsWith('+')) tel = '+420' + tel
    if (seen.has(tel)) continue
    seen.add(tel)

    try {
      await twilioClient.messages.create({ body: msg, from: FROM, to: tel })
      sent.push({ prezdivka: p.prezdivka, tel })
    } catch (err) {
      errors.push({ prezdivka: p.prezdivka, tel, error: err.message })
    }
  }

  return res.json({
    sent: sent.length,
    message_used: msg,
    recipients: sent,
    errors: errors.length ? errors : undefined,
  })
}
