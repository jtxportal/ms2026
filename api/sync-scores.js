// api/sync-scores.js
// Nacte vysledky z API-Football, ulozi do DB a automaticky vyhodnoti ukoncene zapasy

import { createClient } from '@supabase/supabase-js'

const LEAGUE_ID = 1    // FIFA World Cup 2026
const SEASON    = 2026
const API_KEY   = process.env.APIFOOTBALL_KEY

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET && secret !== 'ms2026kacov') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Nacist zapasy z API-Football - vsechny zapasy turnaje
    const apiRes = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}`,
      {
        headers: { 'x-apisports-key': API_KEY }
      }
    )
    const apiData = await apiRes.json()
    const fixtures = apiData.response ?? []

    if (fixtures.length === 0) {
      return res.json({ ok: false, message: 'API vratilo 0 zapasu', apiData })
    }

    // Nacist nase zapasy z DB (nevyhodnocene)
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, vykop, vyhodnoceno, skore_domaci, skore_hosti, fixture_id')
      .eq('vyhodnoceno', false)

    let updated = 0
    let settled = 0
    const errors = []
    const debug = []

    for (const fixture of fixtures) {
      const status   = fixture.fixture?.status?.short
      const elapsed  = fixture.fixture?.status?.elapsed
      const goalsD   = fixture.goals?.home
      const goalsH   = fixture.goals?.away
      const fixtureId = fixture.fixture?.id
      const fixtureDate = new Date(fixture.fixture?.date)

      // Najit odpovidajici zapas - pres fixture_id nebo cas (+-90 minut)
      let match = dbMatches?.find(m => m.fixture_id === fixtureId)
      if (!match) {
        match = dbMatches?.find(m => {
          const diff = Math.abs(new Date(m.vykop) - fixtureDate) / 1000 / 60
          return diff < 90
        })
      }

      if (!match) continue

      debug.push({ fixture: fixtureId, status, goals: `${goalsD}:${goalsH}`, match: match.id })

      // Ulozit fixture_id pro priste
      const updateData = { live_status: status, live_elapsed: elapsed }
      if (!match.fixture_id) updateData.fixture_id = fixtureId
      if (goalsD !== null && goalsH !== null) {
        updateData.skore_domaci = goalsD
        updateData.skore_hosti  = goalsH
      }

      await supabase.from('matches').update(updateData).eq('id', match.id)
      updated++

      // Automaticke vyhodnoceni po FT (Full Time)
      if (status === 'FT' && goalsD !== null && goalsH !== null) {
        const { error } = await supabase.rpc('settle_match', {
          p_match_id:     match.id,
          p_skore_domaci: goalsD,
          p_skore_hosti:  goalsH,
        })
        if (error) {
          errors.push({ match: match.id, error: error.message })
        } else {
          settled++
        }
      }
    }

    return res.json({
      ok: true,
      fixtures_from_api: fixtures.length,
      matched: debug.length,
      updated,
      settled,
      debug: debug.slice(0, 5),
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack })
  }
}
