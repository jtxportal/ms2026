// api/sync-scores.js
// Nacte vysledky z worldcup2026 free API a automaticky vyhodnoti ukoncene zapasy

import { createClient } from '@supabase/supabase-js'

const WC_API = 'https://worldcup26.ir'

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
    // Nacist vsechny zapasy z free API
    const apiRes = await fetch(`${WC_API}/get/games`, {
      headers: { 'Accept': 'application/json' }
    })
    
    if (!apiRes.ok) {
      return res.status(500).json({ error: `API error: ${apiRes.status}`, url: `${WC_API}/get/games` })
    }
    
    const matches_api = await apiRes.json()
    const fixtures = Array.isArray(matches_api) ? matches_api : (matches_api.matches ?? matches_api.data ?? [])

    if (fixtures.length === 0) {
      return res.json({ ok: false, message: 'API vratilo 0 zapasu', sample: matches_api })
    }

    // Nacist nase zapasy z DB (nevyhodnocene)
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, vykop, vyhodnoceno, skore_domaci, skore_hosti')
      .eq('vyhodnoceno', false)

    let updated = 0
    let settled = 0
    const errors = []
    const debug = []

    for (const fix of fixtures) {
      // Ruzne API mohou mit ruzne nazvy poli
      const homeGoals = fix.home_score ?? fix.goals_home ?? fix.score_home ?? fix.home?.score
      const awayGoals = fix.away_score ?? fix.goals_away ?? fix.score_away ?? fix.away?.score
      const status    = fix.status ?? fix.match_status ?? fix.state
      const matchTime = fix.date ?? fix.datetime ?? fix.kickoff ?? fix.match_date

      if (!matchTime) continue

      // Najit odpovidajici zapas v DB podle casu (+-90 minut)
      const fixDate = new Date(matchTime)
      const match = dbMatches?.find(m => {
        const diff = Math.abs(new Date(m.vykop) - fixDate) / 1000 / 60
        return diff < 90
      })

      if (!match) continue

      debug.push({ 
        api_status: status, 
        goals: `${homeGoals}:${awayGoals}`, 
        time: matchTime,
        match_id: match.id 
      })

      // Ulozit live skore
      if (homeGoals !== null && homeGoals !== undefined) {
        await supabase.from('matches').update({
          skore_domaci: parseInt(homeGoals),
          skore_hosti:  parseInt(awayGoals),
          live_status:  String(status ?? ''),
        }).eq('id', match.id)
        updated++
      }

      // Vyhodnotit po skonceni zapasu
      const finished = ['FT', 'finished', 'completed', 'full-time', 'AET', 'PEN'].includes(String(status))
      if (finished && homeGoals !== null && homeGoals !== undefined) {
        const { error } = await supabase.rpc('settle_match', {
          p_match_id:     match.id,
          p_skore_domaci: parseInt(homeGoals),
          p_skore_hosti:  parseInt(awayGoals),
        })
        if (error) errors.push({ match: match.id, error: error.message })
        else settled++
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
    return res.status(500).json({ error: err.message })
  }
}
