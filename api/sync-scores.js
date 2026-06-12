// api/sync-scores.js - verze s maximalnim debugem

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

  // Nacist zapasy z DB - VSECHNY (nejen nevyhodnocene)
  const { data: allMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, vykop, vyhodnoceno, skore_domaci, skore_hosti')
    .order('vykop')
    .limit(10) // prvnich 10 pro debug

  if (dbErr) return res.json({ error: 'DB chyba: ' + dbErr.message })

  // Nacist API data
  const apiRes = await fetch('https://worldcup26.ir/get/games')
  if (!apiRes.ok) return res.json({ error: 'API error: ' + apiRes.status })
  const apiData = await apiRes.json()
  const fixtures = apiData.games ?? []

  // Debug - ukazeme prvni 3 zapasy z DB a prvni 3 z API
  const dbSample = (allMatches ?? []).slice(0, 3).map(m => ({
    id: m.id,
    vykop: m.vykop,
    vykop_ms: new Date(m.vykop).getTime(),
    vyhodnoceno: m.vyhodnoceno
  }))

  const apiSample = fixtures.slice(0, 3).map(f => {
    const [datePart, timePart] = (f.local_date || '').split(' ')
    const [mm, dd, yyyy] = (datePart || '').split('/')
    const [hh, min] = (timePart || '00:00').split(':')
    const fixDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00Z`)
    return {
      teams: f.home_team_name_en + ' vs ' + f.away_team_name_en,
      local_date: f.local_date,
      parsed_utc: fixDate.toISOString(),
      parsed_ms: fixDate.getTime(),
      finished: f.finished
    }
  })

  // Vypocitat rozdil pro prvni DB zapas vs prvni API zapas
  let diffTest = null
  if (dbSample.length > 0 && apiSample.length > 0) {
    const diff = Math.abs(dbSample[0].vykop_ms - apiSample[0].parsed_ms) / 1000 / 60
    diffTest = `Rozdil DB[0] vs API[0]: ${Math.round(diff)} minut`
  }

  // Nyni skutecny sync - vsechny nevyhodnocene
  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, vykop, vyhodnoceno, skore_domaci, skore_hosti')
    .eq('vyhodnoceno', false)

  let updated = 0, settled = 0
  const errors = []
  const matched_list = []

  for (const fix of fixtures) {
    const homeScore = parseInt(fix.home_score ?? '0', 10)
    const awayScore = parseInt(fix.away_score ?? '0', 10)
    const finished  = fix.finished === 'TRUE'
    if (!fix.local_date) continue

    const [datePart, timePart] = fix.local_date.split(' ')
    const [mm, dd, yyyy] = datePart.split('/')
    const [hh, min] = (timePart || '00:00').split(':')
    const fixDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00Z`)

    // Najit nejblizsi zapas - bez limitu vzdalnosti
    let bestMatch = null
    let bestDiff = Infinity
    for (const m of (dbMatches ?? [])) {
      const diff = Math.abs(new Date(m.vykop) - fixDate) / 1000 / 60
      if (diff < bestDiff) { bestDiff = diff; bestMatch = m }
    }

    // Pouzit match pokud je do 14 hodin (840 minut)
    if (!bestMatch || bestDiff > 840) continue

    matched_list.push({
      api: fix.home_team_name_en + ' ' + homeScore + ':' + awayScore + ' ' + fix.away_team_name_en,
      diff_min: Math.round(bestDiff),
      finished
    })

    await supabase.from('matches').update({
      skore_domaci: homeScore,
      skore_hosti:  awayScore,
      live_status:  fix.time_elapsed ?? '',
      home_scorers: fix.home_scorers ?? null,
      away_scorers: fix.away_scorers ?? null,
    }).eq('id', bestMatch.id)
    updated++

    if (finished) {
      const { error } = await supabase.rpc('settle_match', {
        p_match_id: bestMatch.id,
        p_skore_domaci: homeScore,
        p_skore_hosti: awayScore,
      })
      if (error) errors.push(error.message)
      else settled++
    }
  }

  return res.json({
    ok: true,
    db_matches_count: (dbMatches ?? []).length,
    fixtures_from_api: fixtures.length,
    matched: matched_list.length,
    updated,
    settled,
    db_sample: dbSample,
    api_sample: apiSample,
    diff_test: diffTest,
    matched_list: matched_list.slice(0, 5),
    errors: errors.length > 0 ? errors : undefined
  })
}
