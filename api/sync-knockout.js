// api/sync-knockout.js
// Vytvoří/opraví vyřazovací zápasy (šestnáctifinále → finále) z API-Football.
// - Párování týmů přes PŘESNOU shodu jména (žádné "obsahuje zkratku" -> Austria≠Australia).
// - Idempotentní + sebeopravné: pokud zápas s daným api_fixture_id existuje a týmy
//   nesedí, jen je PŘEPÍŠE (nic nemaže). Nové vytvoří.
// Spuštění z prohlížeče:  /api/sync-knockout?secret=<CRON_SECRET>
//   přidej &debug=1 -> jen vypíše, co by udělal, NIC nezapíše.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_KEY      = process.env.API_FOOTBALL_KEY
const API_BASE     = 'https://v3.football.api-sports.io'
const WC_LEAGUE_ID = 1
const WC_SEASON    = 2026

async function apiCall(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY }
  })
  const data = await res.json()
  return data.response
}

function mapFaze(round) {
  const r = (round || '').toLowerCase()
  if (r.includes('round of 32')) return 'sestnactifinale'
  if (r.includes('round of 16')) return 'osmifinale'
  if (r.includes('quarter'))     return 'ctvrtfinale'
  if (r.includes('semi'))        return 'semifinale'
  if (r.includes('3rd place') || r.includes('third place')) return 'o_3_misto'
  if (r.includes('final'))       return 'finale'
  return null
}

// Normalizace: malá písmena, bez diakritiky, bez teček/pomlček navíc
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.\-']/g, ' ').replace(/\s+/g, ' ').trim()

// Kód -> přesná jména, která může API vrátit (anglicky)
const TEAM_NAMES = {
  RSA: ['south africa'], CAN: ['canada'], BRA: ['brazil'], JPN: ['japan'],
  GER: ['germany'], PAR: ['paraguay'], NED: ['netherlands', 'holland'], MAR: ['morocco'],
  CIV: ['ivory coast', 'cote d ivoire'], NOR: ['norway'], FRA: ['france'], SWE: ['sweden'],
  MEX: ['mexico'], ECU: ['ecuador'], ENG: ['england'], COD: ['dr congo', 'congo dr', 'democratic republic of congo'],
  BEL: ['belgium'], SEN: ['senegal'], USA: ['usa', 'united states'], BIH: ['bosnia and herzegovina', 'bosnia'],
  ESP: ['spain'], AUS: ['australia'], POR: ['portugal'], CRO: ['croatia'],
  SUI: ['switzerland'], EGY: ['egypt'], ARG: ['argentina'], CPV: ['cape verde'],
  COL: ['colombia'], GHA: ['ghana'], AUT: ['austria'], NGA: ['nigeria'], ALG: ['algeria'],
  // pro pozdější kola / další možné účastníky:
  KOR: ['south korea', 'korea republic'], DEN: ['denmark'], URU: ['uruguay'],
  TUR: ['turkey', 'turkiye'], IRN: ['iran'], IRQ: ['iraq'], KSA: ['saudi arabia'],
  QAT: ['qatar'], CZE: ['czech republic', 'czechia'], SCO: ['scotland'],
  NZL: ['new zealand'], CMR: ['cameroon'], TUN: ['tunisia'], JOR: ['jordan'],
  UZB: ['uzbekistan'], PER: ['peru'], CHI: ['chile'], VEN: ['venezuela'],
  PAN: ['panama'], CRC: ['costa rica'], HAI: ['haiti'], CUW: ['curacao'],
  ITA: ['italy'], GRE: ['greece'], POL: ['poland'], SRB: ['serbia'],
}

function resolveCode(apiName, ourCodes) {
  const n = norm(apiName)
  if (!n) return null
  // 1) přesná shoda podle známých jmen (jen kódy, které máme v DB)
  for (const code of ourCodes) {
    const names = TEAM_NAMES[code]
    if (names && names.some(x => norm(x) === n)) return code
  }
  // 2) fallback: API vrátí přímo kód (např. "GER")
  const byCode = ourCodes.find(c => norm(c) === n)
  return byCode ?? null
}

export default async function handler(req, res) {
  const secret = req.headers['x-admin-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!API_KEY) return res.status(500).json({ error: 'API_FOOTBALL_KEY not set' })

  const debug = req.query.debug === '1'

  const { data: teams, error: tErr } = await supabase.from('teams').select('id')
  if (tErr) return res.status(500).json({ error: tErr.message })
  const ourCodes = teams.map(t => t.id)

  const { data: existRows, error: eErr } = await supabase
    .from('matches').select('id, api_fixture_id, tym_domaci, tym_hosti')
    .not('api_fixture_id', 'is', null)
  if (eErr) return res.status(500).json({ error: eErr.message })
  const byFix = new Map(existRows.map(r => [r.api_fixture_id, r]))

  const fixtures = await apiCall(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`)
  if (!fixtures?.length) return res.status(500).json({ error: 'No fixtures from API' })

  let created = 0, corrected = 0, unchanged = 0
  const skipped_tbd = []
  const errors = []
  const report = []

  for (const fx of fixtures) {
    const faze = mapFaze(fx.league?.round)
    if (!faze) continue

    const homeApi = fx.teams?.home?.name
    const awayApi = fx.teams?.away?.name
    const home = resolveCode(homeApi, ourCodes)
    const away = resolveCode(awayApi, ourCodes)
    const row = { faze, fixture: fx.fixture.id, home_api: homeApi, away_api: awayApi, home, away }
    report.push(row)

    if (debug) continue
    if (!home || !away) { skipped_tbd.push(row); continue }

    const ex = byFix.get(fx.fixture.id)
    if (ex) {
      if (ex.tym_domaci !== home || ex.tym_hosti !== away) {
        const { error } = await supabase.from('matches')
          .update({ tym_domaci: home, tym_hosti: away, faze, vykop: fx.fixture.date })
          .eq('id', ex.id)
        if (error) errors.push({ fixture: fx.fixture.id, error: error.message })
        else corrected++
      } else unchanged++
    } else {
      const { error } = await supabase.from('matches').insert({
        faze, skupina: null, vykop: fx.fixture.date,
        tym_domaci: home, tym_hosti: away, api_fixture_id: fx.fixture.id,
      })
      if (error) errors.push({ fixture: fx.fixture.id, error: error.message })
      else created++
    }
  }

  if (debug) return res.status(200).json({ debug: true, count: report.length, report })

  return res.status(200).json({
    created, corrected, unchanged,
    skipped_tbd: skipped_tbd.length ? skipped_tbd : undefined,
    errors: errors.length ? errors : undefined,
    report,
  })
}
