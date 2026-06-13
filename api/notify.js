// api/notify.js
// Posle SMS upozorneni hracum kteri nemaji tip na nejblizsi zapasy
// Volat rucne nebo pres cron: GET /api/notify?secret=ms2026kacov

import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

export default async function handler(req, res) {
  // Overit secret
  const secret = req.query.secret || req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )

  const FROM = process.env.TWILIO_FROM_NUMBER

  // Najit zapasy v pristich 48 hodinach
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const { data: matches } = await supabase
    .from('matches')
    .select('id, vykop, tym_domaci, tym_hosti, domaci:tym_domaci(nazev), hosti:tym_hosti(nazev)')
    .gte('vykop', now.toISOString())
    .lte('vykop', in48h.toISOString())
    .eq('vyhodnoceno', false)
    .order('vykop')

  if (!matches || matches.length === 0) {
    return res.json({ sent: 0, message: 'Zadne zapasy v pristich 48h' })
  }

  // Najit hrace s povolenyma notifikacemi a telefonem
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, prezdivka, telefon, notify_whatsapp, notify_hours_before')
    .eq('notify_whatsapp', true)
    .not('telefon', 'is', null)
    .neq('telefon', '')

  if (!profiles || profiles.length === 0) {
    return res.json({ sent: 0, message: 'Zadni hraci s notifikacemi' })
  }

  const sent = []
  const errors = []

  for (const profile of profiles) {
    const hoursBefore = 24  // pevně: nevsazené zápasy na dalších 24 h
    const cutoff = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000)

    // Zapasy pro tohoto hrace v jeho casovem okne
    const relevantMatches = matches.filter(m => new Date(m.vykop) <= cutoff)
    if (relevantMatches.length === 0) continue

    // Zjistit na ktere uz ma tip
    const matchIds = relevantMatches.map(m => m.id)
    const { data: bets } = await supabase
      .from('bets')
      .select('match_id')
      .eq('user_id', profile.id)
      .in('match_id', matchIds)

    const bettedIds = new Set((bets || []).map(b => b.match_id))
    const missingBets = relevantMatches.filter(m => !bettedIds.has(m.id))

    if (missingBets.length === 0) continue

    // Sestavit SMS
    const matchList = missingBets.slice(0, 3).map(m => {
      const d = new Date(m.vykop)
      const time = d.toLocaleString('cs-CZ', { 
        day: 'numeric', month: 'numeric', 
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Prague' 
      })
      return `${m.domaci?.nazev} vs ${m.hosti?.nazev} (${time})`
    }).join(', ')

    const more = missingBets.length > 3 ? ` a dalsi ${missingBets.length - 3}` : ''
    const msg = `Tipovacka MS2026: ${profile.prezdivka}, chybi ti tip na: ${matchList}${more}. Tipuj na: ms2026-phi.vercel.app`

    // Formatovat telefon
    let tel = profile.telefon.replace(/\s/g, '')
    if (tel.startsWith('0')) tel = '+420' + tel.slice(1)
    if (!tel.startsWith('+')) tel = '+420' + tel

    try {
      await twilioClient.messages.create({
        body: msg,
        from: FROM,
        to: tel
      })
      sent.push({ prezdivka: profile.prezdivka, tel, zapasy: missingBets.length })
    } catch (err) {
      errors.push({ prezdivka: profile.prezdivka, tel, error: err.message })
    }
  }

  return res.json({ 
    sent: sent.length, 
    details: sent,
    errors: errors.length > 0 ? errors : undefined
  })
}
