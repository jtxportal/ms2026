import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function parseScorers(raw) {
  if (!raw || raw === 'null') return []
  try {
    // Format: {"Jméno 9'","Jméno 67'"}
    const str = String(raw)
    if (str.startsWith('[')) return JSON.parse(str)
    const inner = str.slice(1, -1) // odebrat { a }
    if (!inner) return []
    return inner.split('","').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

export default function LiveScore({ matchId, vykop }) {
  const [data, setData] = useState(null)

  const kicked = new Date() > new Date(new Date(vykop).getTime() - 5 * 60 * 1000)

  useEffect(() => {
    if (!kicked) return
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [matchId, kicked])

  async function load() {
    const { data: d } = await supabase
      .from('matches')
      .select('vysledek_domaci, vysledek_hosti, live_home, live_away, live_status, live_minute, home_scorers, away_scorers')
      .eq('id', matchId)
      .single()
    if (d) setData(d)
  }

  if (!kicked || !data) return null

  const homeScorers = parseScorers(data.home_scorers)
  const awayScorers = parseScorers(data.away_scorers)
  const status = data.live_status || ''
  const live = ['1H', '2H', 'ET', 'P'].includes(status)
  const done = ['FT', 'finished'].includes(status)

  let label = null
  if (live) label = '🔴 ŽIVĚ' + (data.live_minute ? ` · ${data.live_minute}'` : '')
  else if (status === 'HT') label = '☕ Přestávka'
  else if (done) label = '⏱ Konec'

  if (!label && homeScorers.length === 0 && awayScorers.length === 0) return null

  return (
    <div style={{ marginTop: '6px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${live ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', padding: '10px 14px' }}>
      {label && (
        <p style={{ fontSize: '12px', fontWeight: 700, color: live ? '#4ade80' : 'rgba(255,255,255,0.5)', margin: '0 0 ' + (homeScorers.length + awayScorers.length > 0 ? '8px' : '0') }}>
          {label}
        </p>
      )}
      {(homeScorers.length > 0 || awayScorers.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            {homeScorers.map((s, i) => (
              <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: '2px 0' }}>⚽ {s}</p>
            ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            {awayScorers.map((s, i) => (
              <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: '2px 0' }}>{s} ⚽</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
