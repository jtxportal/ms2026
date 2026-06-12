// api/sync-scores.js
// Nacte vysledky z worldcup26.ir API a automaticky vyhodnoti ukoncene zapasy

import { createClient } from '@supabase/supabase-js'

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
    const apiRes = await fetch('https://worldcup26.ir/get/games', {
      headers: { 'Accept': 'application/json' }
    })
    if (!apiRes.ok) return res.status(500).json({ error: `API error: ${apiRes.status}` })
    
    const apiData = await apiRes.json()
    // Data jsou v poli "games"
    const fixtures = apiData.games ?? []
    if (fixtures.length === 0) return res.json({ ok: false, message: 'API vratilo 0 zapasu' })

    // Nacist nase zapasy z DB
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('id, vykop, vyhodnoceno, skore_domaci, skore_hosti')
      .eq('vyhodnoceno', false)

    let updated = 0
    let settled = 0
    const errors = []
    const debug = []

    for (const fix of fixtures) {
      const homeScore = parseInt(fix.home_score ?? '0', 10)
      const awayScore = parseInt(fix.away_score ?? '0', 10)
      const finished  = fix.finished === 'TRUE' || fix.time_elapsed === 'finished'
      
      // Parsovat datum: format "06/11/2026 13:00" = MM/DD/YYYY HH:MM local time
      // Prevest na UTC (local_date je cas stadion = US/Mexico time, priblizne UTC-6/7)
      // Pouzijeme rozsah +-8 hodin pro matching
      if (!fix.local_date) continue
      const [datePart, timePart] = fix.local_date.split(' ')
      const [mm, dd, yyyy] = datePart.split('/')
      const [hh, min] = (timePart || '00:00').split(':')
      const fixDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00Z`) // jako UTC

      // Najit odpovidajici zapas v DB (+-8 hodin kvuli casovym pasmum)
      const match = dbMatches?.find(m => {
        const diff = Math.abs(new Date(m.vykop) - fixDate) / 1000 / 60
        return diff < 720 // 12 hodin - pokryje rozdil CEST vs US/Mexico time
      })

      if (!match) {
        // Debug - zobrazit prvni nesparovany
        if (debug.length === 0) debug.push({ no_match: fix.home_team_name_en + ' vs ' + fix.away_team_name_en, local_date: fix.local_date, fixDate: fixDate.toISOString() })
        continue
      }

      debug.push({
        api: `${fix.home_team_name_en} ${homeScore}:${awayScore} ${fix.away_team_name_en}`,
        finished,
        match_id: match.id,
        vykop: match.vykop
      })

      // Ulozit skore
      await supabase.from('matches').update({
        skore_domaci:  homeScore,
        skore_hosti:   awayScore,
        live_status:   fix.time_elapsed ?? '',
        home_scorers:  fix.home_scorers ?? null,
        away_scorers:  fix.away_scorers ?? null,
      }).eq('id', match.id)
      updated++

      // Automaticke vyhodnoceni
      if (finished && !match.vyhodnoceno) {
        const { error } = await supabase.rpc('settle_match', {
          p_match_id:     match.id,
          p_skore_domaci: homeScore,
          p_skore_hosti:  awayScore,
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
