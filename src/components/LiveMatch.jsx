import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LABEL = {
  'NS':   'Brzy začíná',
  '1H':   '1. poločas',
  'HT':   'Poločas',
  '2H':   '2. poločas',
  'ET':   'Prodloužení',
  'BT':   'Přestávka prod.',
  'P':    'Penalty',
  'INT':  'Přerušeno',
  'FT':   'Konec',
  'AET':  'Konec (prod.)',
  'PEN':  'Konec (pen.)',
  'PST':  'Odloženo',
  'CANC': 'Zrušeno',
  'LIVE': 'ŽIVĚ',
}

const LIVE_STATUSES  = ['1H','HT','2H','ET','BT','P','INT','LIVE']
const ENDED_STATUSES = ['FT','AET','PEN']

export default function LiveMatch({ match }) {
  const [liveData,  setLiveData]  = useState({
    status:      match.live_status ?? 'NS',
    minute:      match.live_minute ?? 0,
    homeScore:   match.live_home   ?? 0,
    awayScore:   match.live_away   ?? 0,
    updatedAt:   match.live_updated_at,
  })
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const isLive   = LIVE_STATUSES.includes(liveData.status)
  const isEnded  = ENDED_STATUSES.includes(liveData.status)
  const hasScore = isLive || isEnded

  // Real-time subscription na změny matches
  useEffect(() => {
    const channel = supabase
      .channel(`live:match:${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          const m = payload.new
          setLiveData({
            status:    m.live_status ?? 'NS',
            minute:    m.live_minute ?? 0,
            homeScore: m.live_home   ?? 0,
            awayScore: m.live_away   ?? 0,
            updatedAt: m.live_updated_at,
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [match.id])

  // Načíst a sledovat události
  useEffect(() => {
    if (!isLive && !isEnded) return
    loadEvents()

    const channel = supabase
      .channel(`events:match:${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          setEvents(prev => {
            const newE = payload.new
            if (prev.some(e => e.id === newE.id)) return prev
            return [...prev, newE].sort((a,b) => (a.minute ?? 0) - (b.minute ?? 0))
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [match.id, isLive, isEnded])

  async function loadEvents() {
    setLoadingEvents(true)
    const { data } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', match.id)
      .order('minute', { ascending: true })
    setEvents(data ?? [])
    setLoadingEvents(false)
  }

  function eventIcon(e) {
    switch (e.event_type) {
      case 'goal':
        if (e.detail?.toLowerCase().includes('own goal')) return '⚽🔴'
        if (e.detail?.toLowerCase().includes('penalty')) return '⚽✔'
        return '⚽'
      case 'miss_penalty': return '❌'
      case 'card':
        if (e.card_color === 'red') return '🟥'
        if (e.card_color === 'yellow_red') return '🟨🟥'
        return '🟨'
      case 'subst': return '🔄'
      case 'var': return '📺'
      default: return '•'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Live badge + skóre */}
      <div style={{
        background: isLive
          ? 'rgba(220,40,40,0.15)'
          : isEnded
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isLive ? 'rgba(220,40,40,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '14px',
        padding: '16px',
        textAlign: 'center',
      }}>
        {/* Status */}
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {isLive && (
            <span style={{
              background: '#dc2626', color: '#fff',
              fontSize: '10px', fontWeight: 800,
              padding: '2px 8px', borderRadius: '50px',
              letterSpacing: '2px', textTransform: 'uppercase',
              animation: 'pulse 1.5s infinite',
            }}>
              🔴 LIVE
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            {STATUS_LABEL[liveData.status] ?? liveData.status}
            {isLive && liveData.minute > 0 && ` ${liveData.minute}'`}
          </span>
        </div>

        {/* Skóre */}
        {hasScore && (
          <div style={{
            fontSize: '48px', fontWeight: 900, letterSpacing: '-2px',
            color: '#fff', lineHeight: 1,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {liveData.homeScore} : {liveData.awayScore}
          </div>
        )}
        {!hasScore && (
          <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.2)', letterSpacing: '4px' }}>
            – : –
          </div>
        )}
      </div>

      {/* Seznam událostí */}
      {(isLive || isEnded) && events.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px',
            fontSize: '10px', fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            Události zápasu
          </div>
          {events.map(e => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              fontSize: '13px',
            }}>
              <span style={{
                minWidth: '34px', textAlign: 'right',
                color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600,
              }}>
                {e.minute ?? '?'}{e.extra_minute ? `+${e.extra_minute}` : ''}'
              </span>
              <span style={{ fontSize: '16px' }}>{eventIcon(e)}</span>
              <div style={{ flex: 1 }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  {e.player_name ?? ''}
                </span>
                {e.assist_name && (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginLeft: '6px' }}>
                    ({e.assist_name})
                  </span>
                )}
                {e.detail && e.event_type === 'goal' && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginLeft: '6px' }}>
                    {e.detail}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.25)',
                textTransform: 'uppercase',
              }}>
                {e.team_side === 'home' ? match.domaci?.nazev : match.hosti?.nazev}
              </span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.5 }
        }
      `}</style>
    </div>
  )
}
