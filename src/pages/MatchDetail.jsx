import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import LiveMatch  from '../components/LiveMatch'
import Lineups    from '../components/Lineups'
import ChatPanel  from '../components/ChatPanel'
import MatchCard  from '../components/MatchCard'
import { formatDateTime, FAZE_LABEL } from '../lib/utils'

export default function MatchDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [match,   setMatch]   = useState(null)
  const [myBet,   setMyBet]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('live') // 'live' | 'lineups' | 'chat' | 'tip'

  useEffect(() => {
    if (!user) return
    loadData()
  }, [id, user])

  async function loadData() {
    setLoading(true)
    const [{ data: m }, { data: b }] = await Promise.all([
      supabase
        .from('matches')
        .select(`
          *,
          domaci:tym_domaci ( id, nazev, vlajka_url ),
          hosti:tym_hosti   ( id, nazev, vlajka_url )
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('bets')
        .select('*')
        .eq('match_id', id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    setMatch(m)
    setMyBet(b)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>⚽</div>
    </div>
  )

  if (!match) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)' }}>
      Zápas nenalezen
    </div>
  )

  const isLive  = ['1H','HT','2H','ET','BT','P','LIVE'].includes(match.live_status)
  const isEnded = ['FT','AET','PEN'].includes(match.live_status)

  const tabs = [
    { id: 'live',    label: isLive ? '🔴 Live' : isEnded ? '📊 Výsledek' : '📊 Info' },
    { id: 'lineups', label: '👕 Sestavy' },
    { id: 'chat',    label: '💬 Chat' },
    { id: 'tip',     label: myBet ? '✏️ Tip' : '+ Tip' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Zpět */}
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', padding: 0 }}
      >
        ← Zpět
      </button>

      {/* Header zápasu */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
          {match.faze === 'skupina' ? `Skupina ${match.skupina}` : FAZE_LABEL[match.faze]}
          {' · '}{formatDateTime(match.vykop)} CEST
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            {match.domaci?.vlajka_url && (
              <img src={match.domaci.vlajka_url} alt="" style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
            )}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{match.domaci?.nazev}</div>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}>vs</div>
          <div style={{ textAlign: 'center' }}>
            {match.hosti?.vlajka_url && (
              <img src={match.hosti.vlajka_url} alt="" style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
            )}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{match.hosti?.nazev}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flexShrink: 0,
              padding: '7px 14px', borderRadius: '20px',
              fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1px solid ${tab === t.id ? 'rgba(0,150,200,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: tab === t.id ? 'rgba(0,120,200,0.3)' : 'rgba(255,255,255,0.04)',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Obsah tabů */}
      {tab === 'live' && (
        <LiveMatch match={match} />
      )}

      {tab === 'lineups' && (
        <Lineups
          matchId={Number(id)}
          homeTeam={match.domaci}
          awayTeam={match.hosti}
        />
      )}

      {tab === 'chat' && (
        <ChatPanel
          roomType="match"
          matchId={Number(id)}
          title={`Chat: ${match.domaci?.nazev} vs ${match.hosti?.nazev}`}
        />
      )}

      {tab === 'tip' && (
        <MatchCard match={match} myBet={myBet} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
