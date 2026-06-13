// api/sync-fixtures.js
// Jednorázová synchronizace — namapuje API-Football fixture IDs na naše match ID
// Zavolat jednou z admin panelu: POST /api/sync-fixtures
// Vyžaduje: API_FOOTBALL_KEY + SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_KEY  = process.env.API_FOOTBALL_KEY
const API_BASE = 'https://v3.football.api-sports.io'
const WC_LEAGUE_ID = 1    // FIFA World Cup v API-Football
const WC_SEASON    = 2026

async function apiCall(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY }
  })
  const data = await res.json()
  return data.response
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  // Ochrana — jen admin
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'API_FOOTBALL_KEY not set' })
  }

  // Načíst naše zápasy z DB
  const { data: ourMatches, error } = await supabase
    .from('matches')
    .select('id, vykop, tym_domaci, tym_hosti, api_fixture_id')
    .order('vykop')

  if (error) return res.status(500).json({ error: error.message })

  // Stáhnout fixtures z API-Football (skupinová fáze = group stage)
  const fixtures = await apiCall(
    `/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`
  )

  if (!fixtures?.length) {
    return res.status(500).json({ error: 'No fixtures from API' })
  }

  let mapped   = 0
  let skipped  = 0
  const errors = []

  for (const fixture of fixtures) {
    const apiDate   = new Date(fixture.fixture.date)
    const homeTeam  = fixture.teams.home.name
    const awayTeam  = fixture.teams.away.name
    const fixtureId = fixture.fixture.id

    // Najít odpovídající zápas v naší DB (±3 hodiny + týmy)
    const match = ourMatches.find(m => {
      const dbDate = new Date(m.vykop)
      const diffHours = Math.abs(dbDate - apiDate) / 3600000
      if (diffHours > 3) return false

      // Porovnat týmy (kód z naší DB vs. jméno z API — přibližná shoda)
      const homeMatch = matchTeam(m.tym_domaci, homeTeam)
      const awayMatch = matchTeam(m.tym_hosti,  awayTeam)
      return homeMatch && awayMatch
    })

    if (!match) {
      skipped++
      continue
    }

    if (match.api_fixture_id && match.api_fixture_id !== fixtureId) {
      errors.push(`Match ${match.id}: collision ${match.api_fixture_id} vs ${fixtureId}`)
      continue
    }

    const { error: updateErr } = await supabase
      .from('matches')
      .update({ api_fixture_id: fixtureId })
      .eq('id', match.id)

    if (updateErr) {
      errors.push(`Match ${match.id}: ${updateErr.message}`)
    } else {
      mapped++
    }
  }

  return res.status(200).json({
    total_api:   fixtures.length,
    total_db:    ourMatches.length,
    mapped,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// Přibližné párování týmů: náš kód (CZE) vs. API název (Czech Republic / Czechia)
const TEAM_ALIASES = {
  'CZE': ['Czech Republic', 'Czechia', 'Czech'],
  'KOR': ['South Korea', 'Korea Republic', 'Korea'],
  'RSA': ['South Africa'],
  'CIV': ["Ivory Coast", "Côte d'Ivoire", 'Cote d\'Ivoire'],
  'COD': ['DR Congo', 'Congo DR', 'Democratic Republic of Congo'],
  'CPV': ['Cape Verde'],
  'KSA': ['Saudi Arabia'],
  'NZL': ['New Zealand'],
  'SCO': ['Scotland'],
  'ENG': ['England'],
  'PAR': ['Paraguay'],
  'URU': ['Uruguay'],
  'ECU': ['Ecuador'],
  'COL': ['Colombia'],
  'NOR': ['Norway'],
  'SWE': ['Sweden'],
  'DEN': ['Denmark'],
  'TUR': ['Turkey', 'Türkiye'],
  'IRN': ['Iran'],
  'IRQ': ['Iraq'],
  'JOR': ['Jordan'],
  'ALG': ['Algeria'],
  'SEN': ['Senegal'],
  'GHA': ['Ghana'],
  'TUN': ['Tunisia'],
  'MAR': ['Morocco'],
  'EGY': ['Egypt'],
  'CMR': ['Cameroon'],
  'NGA': ['Nigeria'],
  'UZB': ['Uzbekistan'],
  'CUW': ['Curaçao', 'Curacao'],
  'BIH': ['Bosnia and Herzegovina', 'Bosnia'],
  'SUI': ['Switzerland'],
  'NED': ['Netherlands', 'Holland'],
  'JPN': ['Japan'],
  'ESP': ['Spain'],
  'AUT': ['Austria'],
}

function matchTeam(ourCode, apiName) {
  if (!ourCode || !apiName) return false
  const api = apiName.toLowerCase()

  // Přímá shoda s kódem
  if (api.includes(ourCode.toLowerCase())) return true

  // Aliasy
  const aliases = TEAM_ALIASES[ourCode] ?? []
  return aliases.some(a => api.includes(a.toLowerCase()))
}
