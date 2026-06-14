// api/backfill-events.js
// JEDNORÁZOVÝ endpoint — doplní team_side (home/hosté) ke stávajícím událostem.
// Spustit ručně po nasazení:
//   Invoke-RestMethod -Uri "https://ms2026-phi.vercel.app/api/backfill-events?secret=ms2026kacov"
// Bezpečné: aktualizuje POUZE sloupec team_side, ostatní data nechává být.
// Lze spustit opakovaně (idempotentní).

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_KEY  = process.env.API_FOOTBALL_KEY
const API_BASE = 'https://v3.football.api-sports.io'

async function apiCall(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-key': API_KEY }
  })
  if (!res.ok) throw new Error(`API-Football ${endpoint}: ${res.status}`)
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`)
  }
  return data.response
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

export default async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 1) Které zápasy mají uložené události?
    const { data: evRows, error: evErr } = await supabase
      .from('match_events')
      .select('match_id')
    if (evErr) throw evErr

    const matchIds = [...new Set((evRows ?? []).map(r => r.match_id))]
    if (matchIds.length === 0) {
      return res.status(200).json({ message: 'Žádné události k doplnění', updated: 0 })
    }

    // 2) K nim api_fixture_id
    const { data: matches, error: mErr } = await supabase
      .from('matches')
      .select('id, api_fixture_id')
      .in('id', matchIds)
      .not('api_fixture_id', 'is', null)
    if (mErr) throw mErr

    // 3) Z fixtures zjistit ID domácího týmu (batch po 20)
    const homeByFixture = {}
    for (const part of chunk(matches.map(m => m.api_fixture_id), 20)) {
      const fixtures = await apiCall(`/fixtures?ids=${part.join('-')}`)
      for (const f of fixtures) homeByFixture[f.fixture.id] = f.teams?.home?.id ?? null
    }

    // 4) Pro každý zápas stáhnout události a doplnit POUZE team_side
    let updated = 0
    const skipped = []
    for (const m of matches) {
      const homeId = homeByFixture[m.api_fixture_id]
      if (homeId == null) { skipped.push({ match: m.id, reason: 'no home id' }); continue }

      const events = await apiCall(`/fixtures/events?fixture=${m.api_fixture_id}`)
      if (!events?.length) continue

      for (let idx = 0; idx < events.length; idx++) {
        const side = events[idx].team?.id === homeId ? 'home' : 'away'
        const { error: uErr } = await supabase
          .from('match_events')
          .update({ team_side: side })
          .eq('match_id', m.id)
          .eq('api_event_id', idx)
        if (!uErr) updated++
      }
    }

    return res.status(200).json({
      message: 'Hotovo',
      matches: matches.length,
      updated,
      skipped: skipped.length ? skipped : undefined,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
