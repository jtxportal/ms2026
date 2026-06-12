import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function parseScorers(str) {
  if (!str || str === 'null') return []
  try {
    const inner = str.replace(/^\{/, '').replace(/\}$/, '')
    if (!inner) return []
    return inner.split('","'). map(s => s.replace(/^"/, '').replace(/"$/, '').trim()).filter(Boolean)
  } catch { return [] }
}

export default function LiveScore({ matchId, vykop }) {
  const [match, setMatch] = useState(null)
  const kicked = new Date() > new Date(new Date(vykop).getTime() - 5 * 60 * 1000)

  useEffect(() => {
    if (!kicked) return
    fetchMatch()
    const iv = setInterval(fetchMatch, 60000)
    return () => clearInterval(iv)
  }, [matchId, kicked])

  async function fetchMatch() {
    const { data } = await supabase
      .from('matches')
      .select('vysledek_domaci, vysledek_hosti, live_home, live_away, live_status, live_minute, home_scorers, away_scorers')
      .eq('id', matchId)
      .single()
    if (data) setMatch(data)
  }

  if (!kicked || !match) return null

  const homeScorers = parseScorers(match.home_scorers)
  const awayScorers = parseScorers(match.away_scorers)
  const status = match.live_status
  const live   = ['1H', '2H', 'ET', 'P'].includes(status)
  const done   = ['FT', 'finished'].includes(status)

  const statusLabel = live ? `🔴 ŽIVĚ · ${match.live_minute || ''}'`
    : status === 'HT' ? '☕ Přestávka'
    : done ? '⏱ Konec'
    : null

  if (!statusLabel && homeScorers.length === 0 && awayScorers.length === 0) return null

  return (
    <div style={{ marginTop: '6px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${live ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '10px 14px' }}>
      {statusLabel && (
        <div style={{ fontSize: '12px', fontWeight: 700, color: live ? '#4ade80' : 'rgba(255,255,255,0.5)', marginBottom: (homeScorers.length + awayScorers.length) > 0 ? '8px' : 0 }}>
          {statusLabel}
        </div>
      )}
      {(homeScorers.length > 0 || awayScorers.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>{homeScorers.map((s, i) => <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', padding: '2px 0' }}>⚽ {s}</div>)}</div>
          <div style={{ textAlign: 'right' }}>{awayScorers.map((s, i) => <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', padding: '2px 0' }}>{s} ⚽</div>)}</div>
        </div>
      )}
    </div>
  )
}
