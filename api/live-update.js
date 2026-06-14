// api/live-update.js
// Vercel Serverless Function — volána každou minutu cronen
// Stahuje živá data z API-Football a zapisuje do Supabase
//
// Vercel cron: nastav v vercel.json:
//   "crons": [{ "path": "/api/live-update", "schedule": "* * * * *" }]

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // service_role obchází RLS
)

const API_KEY    = process.env.API_FOOTBALL_KEY
const API_BASE   = 'https://v3.football.api-sports.io'

// Stavy zápasu z API-Football
const LIVE_STATUSES  = ['1H','HT','2H','ET','BT','P','INT','LIVE']
const ENDED_STATUSES = ['FT','AET','PEN']
const UPCOMING_MIN   = 75 // minuty před výkopem → začít sledovat

async function apiCall(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'x-apisports-key': API_KEY,
      'x-rapidapi-key':  API_KEY,
    }
  })
  if (!res.ok) throw new Error(`API-Football ${endpoint}: ${res.status}`)
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`)
  }
  return data.response
}

// ── Najdi zápasy k pollingování ────────────────────────────
async function getMatchesToPoll() {
  const now = new Date()
  // Sleduj od 75 min před výkopem do 6 h po výkopu (dlouhé nastavení/VAR/pozdní start).
  // Navíc vždy znovu načti zápasy "zamrzlé" v živém stavu (nedopollovaný konec),
  // ať se uvíznuté zápasy bez výsledku dořeší bez ohledu na stáří.
  const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + UPCOMING_MIN * 60 * 1000)

  const { data, error } = await supabase
    .from('matches')
    .select('id, api_fixture_id, vykop, live_status, vyhodnoceno')
    .not('api_fixture_id', 'is', null)
    .eq('vyhodnoceno', false)
    .lte('vykop', windowEnd.toISOString())
    .or(`vykop.gte.${windowStart.toISOString()},live_status.in.(${LIVE_STATUSES.join(',')})`)

  if (error) throw error
  return data ?? []
}

// ── Aktualizace live skóre a statusu ──────────────────────
async function updateLiveScore(match, fixtureData) {
  const f = fixtureData.fixture
  const g = fixtureData.goals
  const s = fixtureData.score

  const status     = f.status.short
  const minute     = f.status.elapsed ?? 0
  const liveHome   = g.home ?? 0
  const liveAway   = g.away ?? 0

  const update = {
    live_status:     status,
    live_minute:     minute,
    live_home:       liveHome,
    live_away:       liveAway,
    live_updated_at: new Date().toISOString(),
  }

  // Pokud zápas skončil → nastavit i finální výsledek
  if (ENDED_STATUSES.includes(status)) {
    update.vysledek_domaci = liveHome
    update.vysledek_hosti  = liveAway
  }

  await supabase
    .from('matches')
    .update(update)
    .eq('id', match.id)
}

// ── Události (góly, karty, střídání) ──────────────────────
async function updateEvents(matchId, fixtureId, homeId = null) {
  const events = await apiCall(`/fixtures/events?fixture=${fixtureId}`)
  if (!events?.length) return

  // Upsert — UNIQUE(match_id, api_event_id)
  const rows = events.map((e, idx) => ({
    match_id:      matchId,
    api_event_id:  idx,                        // pořadové číslo jako ID (API nemá explicitní ID)
    minute:        e.time?.elapsed ?? null,
    extra_minute:  e.time?.extra ?? null,
    event_type:    mapEventType(e.type, e.detail),
    team_side:     homeId == null ? null       // domácí/hosté podle ID týmu z fixture
                   : (e.team?.id === homeId ? 'home' : 'away'),
    player_name:   e.player?.name ?? null,
    assist_name:   e.assist?.name ?? null,
    card_color:    mapCardColor(e.detail),
    detail:        e.detail ?? null,
  }))

  await supabase
    .from('match_events')
    .upsert(rows, { onConflict: 'match_id,api_event_id', ignoreDuplicates: false })
}

// ── Soupisky (jen jednou, nepřepisovat pokud už máme) ─────
async function updateLineups(matchId, fixtureId) {
  // Zkontrolovat jestli už máme soupisky
  const { data: existing } = await supabase
    .from('match_lineups')
    .select('id')
    .eq('match_id', matchId)
    .limit(1)

  if (existing?.length > 0) return  // Už máme, přeskočit

  const lineups = await apiCall(`/fixtures/lineups?fixture=${fixtureId}`)
  if (!lineups?.length) return

  const rows = lineups.map(l => ({
    match_id:   matchId,
    team_side:  null,                           // doplní se ze struktury
    team_code:  null,
    formation:  l.formation ?? null,
    coach_name: l.coach?.name ?? null,
    players: [
      ...(l.startXI ?? []).map(p => ({
        number:     p.player.number,
        name:       p.player.name,
        pos:        p.player.pos,
        grid:       p.player.grid,
        is_starter: true,
      })),
      ...(l.substitutes ?? []).map(p => ({
        number:     p.player.number,
        name:       p.player.name,
        pos:        p.player.pos,
        grid:       null,
        is_starter: false,
      })),
    ],
    updated_at: new Date().toISOString(),
  }))

  // Přiřadit home/away podle pořadí (API vrací [home, away])
  if (rows[0]) rows[0].team_side = 'home'
  if (rows[1]) rows[1].team_side = 'away'

  await supabase
    .from('match_lineups')
    .upsert(rows, { onConflict: 'match_id,team_side' })
}

// ── Pomocné mapovací funkce ────────────────────────────────
function mapEventType(type, detail) {
  if (type === 'Goal') {
    if (detail === 'Missed Penalty') return 'miss_penalty'
    return 'goal'
  }
  if (type === 'Card') return 'card'
  if (type === 'subst') return 'subst'
  if (type === 'Var') return 'var'
  return 'goal'
}

function mapCardColor(detail) {
  if (!detail) return null
  if (detail.toLowerCase().includes('yellow card')) return 'yellow'
  if (detail.toLowerCase().includes('red card')) return 'red'
  if (detail.toLowerCase().includes('yellow red')) return 'yellow_red'
  return null
}

// ── Hlavní handler ─────────────────────────────────────────
export default async function handler(req, res) {
  // Autorizace — jen Vercel cron nebo admin s secret
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'API_FOOTBALL_KEY not set' })
  }

  const results    = []
  const errors     = []
  const reconciled = []

  try {
    // Dorovnání: vyhodnoť všechny dohrané, ale ještě nevyhodnocené zápasy.
    // Pojistka, kdyby vyhodnocení v poll-okně uteklo (dlouhé nastavení / VAR / výpadek běhu).
    const { data: stuck } = await supabase
      .from('matches').select('id')
      .eq('vyhodnoceno', false)
      .in('live_status', ENDED_STATUSES)
    for (const m of (stuck || [])) {
      const { error: e } = await supabase.rpc('settle_match', { p_match_id: m.id })
      if (e) errors.push({ match: m.id, error: 'reconcile: ' + e.message })
      else reconciled.push(m.id)
    }

    const matches = await getMatchesToPoll()

    if (matches.length === 0) {
      return res.status(200).json({ message: 'No matches to poll', updated: 0, reconciled })
    }

    // Batch call — až 20 fixture IDs najednou
    const ids = matches.map(m => m.api_fixture_id).join('-')
    const fixtures = await apiCall(`/fixtures?ids=${ids}`)

    for (const fixtureData of fixtures) {
      const fixtureId = fixtureData.fixture.id
      const match = matches.find(m => m.api_fixture_id === fixtureId)
      if (!match) continue

      try {
        await updateLiveScore(match, fixtureData)
        results.push(fixtureId)

        const status = fixtureData.fixture.status.short

        // Události stahujeme jen během živého zápasu nebo po skončení (jednou)
        if (LIVE_STATUSES.includes(status) || ENDED_STATUSES.includes(status)) {
          await updateEvents(match.id, fixtureId, fixtureData.teams?.home?.id ?? null)
        }

        // Po skončení zápasu vyhodnotit: rozdělit bank výhercům, jinak přesun do jackpotu.
        // settle_match je idempotentní — pokud je už vyhodnoceno, nic neudělá.
        if (ENDED_STATUSES.includes(status)) {
          const { error: settleErr } = await supabase.rpc('settle_match', { p_match_id: match.id })
          if (settleErr) errors.push({ fixture: fixtureId, error: 'settle: ' + settleErr.message })
        }

        // Soupisky stahujeme 60 min před výkopem
        const minutesToKickoff = (new Date(match.vykop) - new Date()) / 60000
        if (minutesToKickoff < 65) {
          await updateLineups(match.id, fixtureId)
        }
      } catch (err) {
        errors.push({ fixture: fixtureId, error: err.message })
      }
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }

  return res.status(200).json({
    updated: results.length,
    fixtures: results,
    reconciled: reconciled.length > 0 ? reconciled : undefined,
    errors: errors.length > 0 ? errors : undefined,
  })
}
