// api/sync-knockout.js
// Vytvoří vyřazovací zápasy (šestnáctifinále → finále) z API-Football.
// Idempotentní: zápas s daným api_fixture_id už nevytvoří podruhé.
// Zavolat: POST /api/sync-knockout  (header x-admin-secret: <CRON_SECRET>)
// Lze volat opakovaně — jak se po skupinách doplní soupeři, přibydou další zápasy.

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

// Round z API → naše faze. Pořadí kontrol je důležité (semi/quarter/3rd před 'final').
function mapFaze(round) {
  const r = (round || '').toLowerCase()
  if (r.includes('round of 32')) return 'sestnactifinale'
  if (r.includes('round of 16')) return 'osmifinale'
  if (r.includes('quarter'))     return 'ctvrtfinale'
  if (r.includes('semi'))        return 'semifinale'
  if (r.includes('3rd place') || r.includes('third place')) return 'o_3_misto'
  if (r.includes('final'))       return 'finale'
  return null   // skupiny apod. → ignorovat
}

export default async function handler(req, res) {
  // Autorizace — header (x-admin-secret) NEBO ?secret= v URL (pro spuštění z prohlížeče)
  const secret = req.headers['x-admin-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!API_KEY) return res.status(500).json({ error: 'API_FOOTBALL_KEY not set' })

  // Naše týmy (kód = id) a už existující api_fixture_id (kvůli idempotenci)
  const { data: teams, error: tErr } = await supabase.from('teams').select('id')
  if (tErr) return res.status(500).json({ error: tErr.message })
  const ourCodes = teams.map(t => t.id)

  const { data: existing, error: eErr } = await supabase
    .from('matches').select('api_fixture_id').not('api_fixture_id', 'is', null)
  if (eErr) return res.status(500).json({ error: eErr.message })
  const known = new Set(existing.map(m => m.api_fixture_id))

  // Stáhnout všechny fixtures turnaje
  const fixtures = await apiCall(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`)
  if (!fixtures?.length) return res.status(500).json({ error: 'No fixtures from API' })

  let created = 0
  const skipped_tbd = []   // soupeři ještě nejsou jasní
  const skipped_dup = []   // už existuje
  const errors = []
  const createdList = []

  for (const fx of fixtures) {
    const faze = mapFaze(fx.league?.round)
    if (!faze) continue                          // jen vyřazovací část

    const fixtureId = fx.fixture.id
    if (known.has(fixtureId)) { skipped_dup.push(fixtureId); continue }

    const home = resolveCode(fx.teams?.home?.name, ourCodes)
    const away = resolveCode(fx.teams?.away?.name, ourCodes)
    if (!home || !away) {                         // soupeř ještě není znám (TBD)
      skipped_tbd.push({ round: fx.league?.round, home: fx.teams?.home?.name, away: fx.teams?.away?.name })
      continue
    }

    const { error: insErr } = await supabase.from('matches').insert({
      faze,
      skupina:        null,
      vykop:          fx.fixture.date,
      tym_domaci:     home,
      tym_hosti:      away,
      api_fixture_id: fixtureId,
    })

    if (insErr) errors.push({ fixture: fixtureId, error: insErr.message })
    else { created++; createdList.push(`${faze}: ${home}-${away}`) }
  }

  return res.status(200).json({
    created,
    createdList: createdList.length ? createdList : undefined,
    skipped_existing: skipped_dup.length,
    skipped_tbd:      skipped_tbd.length ? skipped_tbd : undefined,
    errors:           errors.length ? errors : undefined,
  })
}

// Reverzní mapování: anglický název z API → náš 3písmenný kód
function resolveCode(apiName, ourCodes) {
  if (!apiName) return null
  return ourCodes.find(code => matchTeam(code, apiName)) ?? null
}

const TEAM_ALIASES = {
  'CZE': ['Czech Republic', 'Czechia', 'Czech'],
  'KOR': ['South Korea', 'Korea Republic', 'Korea'],
  'RSA': ['South Africa'],
  'CIV': ["Ivory Coast", "Côte d'Ivoire", "Cote d'Ivoire"],
  'COD': ['DR Congo', 'Congo DR', 'Democratic Republic of Congo'],
  'CPV': ['Cape Verde'],
  'KSA': ['Saudi Arabia'],
  'NZL': ['New Zealand'],
  'SCO': ['Scotland'], 'ENG': ['England'], 'PAR': ['Paraguay'],
  'URU': ['Uruguay'], 'ECU': ['Ecuador'], 'COL': ['Colombia'],
  'NOR': ['Norway'], 'SWE': ['Sweden'], 'DEN': ['Denmark'],
  'TUR': ['Turkey', 'Türkiye'], 'IRN': ['Iran'], 'IRQ': ['Iraq'],
  'JOR': ['Jordan'], 'ALG': ['Algeria'], 'SEN': ['Senegal'],
  'GHA': ['Ghana'], 'TUN': ['Tunisia'], 'MAR': ['Morocco'],
  'EGY': ['Egypt'], 'CMR': ['Cameroon'], 'NGA': ['Nigeria'],
  'UZB': ['Uzbekistan'], 'CUW': ['Curaçao', 'Curacao'],
  'BIH': ['Bosnia and Herzegovina', 'Bosnia'], 'SUI': ['Switzerland'],
  'NED': ['Netherlands', 'Holland'], 'JPN': ['Japan'], 'ESP': ['Spain'],
  'AUT': ['Austria'],
}

function matchTeam(ourCode, apiName) {
  if (!ourCode || !apiName) return false
  const api = apiName.toLowerCase()
  if (api.includes(ourCode.toLowerCase())) return true
  const aliases = TEAM_ALIASES[ourCode] ?? []
  return aliases.some(a => api.includes(a.toLowerCase()))
}
