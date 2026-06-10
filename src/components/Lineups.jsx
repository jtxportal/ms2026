import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Lineups({ matchId, homeTeam, awayTeam }) {
  const [lineups,  setLineups]  = useState({ home: null, away: null })
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState('home') // 'home' | 'away' | 'field'

  useEffect(() => {
    if (!matchId) return
    loadLineups()

    // Real-time update když přijdou soupisky
    const channel = supabase
      .channel(`lineups:match:${matchId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'match_lineups',
        filter: `match_id=eq.${matchId}`,
      }, () => loadLineups())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [matchId])

  async function loadLineups() {
    const { data } = await supabase
      .from('match_lineups')
      .select('*')
      .eq('match_id', matchId)

    const home = data?.find(l => l.team_side === 'home') ?? null
    const away = data?.find(l => l.team_side === 'away') ?? null
    setLineups({ home, away })
    setLoading(false)
  }

  if (loading) return null

  if (!lineups.home && !lineups.away) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.3)',
      }}>
        ⏳ Soupisky budou k dispozici ~60 min před výkopem
      </div>
    )
  }

  const currentLineup = view === 'away' ? lineups.away : lineups.home
  const starters   = currentLineup?.players?.filter(p => p.is_starter) ?? []
  const subs        = currentLineup?.players?.filter(p => !p.is_starter) ?? []

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          👕 Soupisky
        </span>
        {/* Přepínač Domácí / Hosté */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: 'home', label: homeTeam?.nazev ?? 'Domácí' },
            { id: 'away', label: awayTeam?.nazev  ?? 'Hosté' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                background: view === t.id ? 'rgba(0,120,180,0.4)' : 'transparent',
                border: `1px solid ${view === t.id ? 'rgba(0,120,180,0.6)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '8px', padding: '4px 10px',
                color: view === t.id ? '#fff' : 'rgba(255,255,255,0.45)',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: '100px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {currentLineup && (
        <div>
          {/* Formace + trenér */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 14px',
            fontSize: '12px', color: 'rgba(255,255,255,0.45)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span>⚙️ Formace: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{currentLineup.formation ?? '?'}</strong></span>
            {currentLineup.coach_name && (
              <span>🎽 {currentLineup.coach_name}</span>
            )}
          </div>

          {/* Základní sestava */}
          <div style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '8px' }}>
              Základní sestava ({starters.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '4px' }}>
              {starters.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '5px 8px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                }}>
                  <span style={{
                    width: '22px', height: '22px',
                    background: 'rgba(0,100,200,0.4)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, color: '#fff',
                    flexShrink: 0,
                  }}>
                    {p.number}
                  </span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                      {p.pos}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Náhradníci */}
          {subs.length > 0 && (
            <div style={{ padding: '0 14px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', margin: '10px 0 8px' }}>
                Náhradníci ({subs.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {subs.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '3px 8px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '6px',
                    fontSize: '11px', color: 'rgba(255,255,255,0.5)',
                  }}>
                    <span style={{ opacity: 0.6 }}>{p.number}</span>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
