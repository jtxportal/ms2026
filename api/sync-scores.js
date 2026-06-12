// api/sync-scores.js
// Načte výsledky z API-Football, uloží do DB a automaticky vyhodnotí ukončené zápasy

import { createClient } from '@supabase/supabase-js'

const LEAGUE_ID = 1  // FIFA World Cup 2026
const SEASON   = 2026
const API_KEY  = process.env.APIFOOTBALL_KEY

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
    // Načíst live + dnešní zápasy z API-Football
    const apiRes = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}&timezone=Europe/Prague`,
      {
        headers: {
          'x-apisports-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      }
    )
    const apiData = await apiRes.json()
    const fixtures = apiData.response ?? []

    // Načíst naše zápasy z DB
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, vykop, tym_domaci, tym_hosti, vyhodnoceno, skore_domaci, skore_hosti')
      .eq('vyhodnoceno', false)

    let updated = 0
    let settled = 0
    const errors = []

    for (const fixture of fixtures) {
      const status  = fixture.fixture?.status?.short  // FT, 1H, HT, 2H, ET, P, NS atd.
      const elapsed = fixture.fixture?.status?.elapsed
      const goalsD  = fixture.goals?.home
      const goalsH  = fixture.goals?.away
      const homeTeam = fixture.teams?.home?.name
      const awayTeam = fixture.teams?.away?.name
      const fixtureDate = new Date(fixture.fixture?.date)

      // Najít odpovídající zápas v DB podle data a přibližného času (±2h)
      const match = dbMatches?.find(m => {
        const diff = Math.abs(new Date(m.vykop) - fixtureDate) / 1000 / 60  // minuty
        return diff < 120
      })

      if (!match) continue

      // Uložit live skóre
      if (goalsD !== null && goalsH !== null) {
        await supabase.from('matches').update({
          skore_domaci: goalsD,
          skore_hosti: goalsH,
          live_status: status,
          live_elapsed: elapsed,
        }).eq('id', match.id)
        updated++
      }

      // Automatické vyhodnocení po ukončení zápasu (FT = Full Time)
      if (status === 'FT' && goalsD !== null && goalsH !== null && !match.vyhodnoceno) {
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
      fixtures_checked: fixtures.length,
      updated,
      settled,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
