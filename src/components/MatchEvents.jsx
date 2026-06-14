import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function fmtMin(e) {
  return e.extra_minute ? `${e.minute}+${e.extra_minute}'` : `${e.minute}'`
}

function describe(e) {
  if (e.event_type === 'goal') {
    const tag = e.detail === 'Penalty'   ? ' (pen.)'
              : e.detail === 'Own Goal'  ? ' (vlastní)'
              : ''
    return { icon: '⚽', text: (e.player_name || '?') + tag,
             sub: e.assist_name ? `asist. ${e.assist_name}` : null }
  }
  if (e.event_type === 'card') {
    return { icon: e.card_color === 'red' ? '🟥' : '🟨',
             text: e.player_name || '?', sub: null }
  }
  if (e.event_type === 'subst') {
    return { icon: '🔄', text: e.player_name || '?',
             sub: e.assist_name ? `↔ ${e.assist_name}` : null }
  }
  return { icon: '•', text: e.player_name || '', sub: null }
}

export default function MatchEvents({ matchId, live = false }) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    let active = true
    const load = () =>
      supabase.from('match_events').select('*')
        .eq('match_id', matchId).order('minute').order('id')
        .then(({ data }) => { if (active) setEvents(data || []) })
    load()
    let timer
    if (live) timer = setInterval(load, 60000)
    return () => { active = false; if (timer) clearInterval(timer) }
  }, [matchId, live])

  const muted = { fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '6px 2px' }
  if (events === null) return <div style={muted}>Načítám průběh…</div>
  if (events.length === 0) return <div style={muted}>Zatím žádné události</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.map((e, i) => {
        const r = describe(e)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, padding: '2px 0' }}>
            <span style={{ minWidth: 36, textAlign: 'right', color: 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums' }}>{fmtMin(e)}</span>
            <span style={{ width: 18, textAlign: 'center', flexShrink: 0 }}>{r.icon}</span>
            <span style={{ color: '#fff' }}>{r.text}</span>
            {r.sub && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{r.sub}</span>}
          </div>
        )
      })}
    </div>
  )
}
