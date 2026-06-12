import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Zobrazí tipy ostatních + bank po výkopu zápasu
export default function BetsReveal({ matchId, vykop, vyhodnoceno, skore_domaci, skore_hosti }) {
  const [open,    setOpen]    = useState(false)
  const [bets,    setBets]    = useState([])
  const [loading, setLoading] = useState(false)
  const [bank,    setBank]    = useState(0)
  const [count,   setCount]   = useState(0)

  const kicked = new Date() > new Date(vykop)
  if (!kicked) return null  // před výkopem nic nezobrazovat

  useEffect(() => {
    // Načíst summary (bank + počet) vždy
    supabase
      .from('bets')
      .select('castka')
      .eq('match_id', matchId)
      .then(({ data }) => {
        const sum = (data ?? []).reduce((a, b) => a + (b.castka ?? 0), 0)
        setBank(sum)
        setCount((data ?? []).length)
      })
  }, [matchId])

  async function fetchBets() {
    setLoading(true)
    const { data } = await supabase
      .from('bets')
      .select('tip_domaci, tip_hosti, vyhra, profiles(prezdivka)')
      .eq('match_id', matchId)
      .order('tip_domaci')
    setBets(data ?? [])
    setLoading(false)
  }

  function trefil(b) {
    if (!vyhodnoceno || skore_domaci == null) return null
    return b.tip_domaci === skore_domaci && b.tip_hosti === skore_hosti
  }

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Bank summary - vždy viditelný */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
        <div style={{ flex: 1, background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.25)', borderRadius: '10px', padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>💰 Ve hře</span>
          <strong style={{ fontSize: '14px', color: '#e8a020' }}>{bank} Kč</strong>
        </div>
        <div style={{ flex: 1, background: 'rgba(0,180,200,0.08)', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '10px', padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>👥 Tipuje</span>
          <strong style={{ fontSize: '14px', color: '#00b4c8' }}>{count}</strong>
        </div>
      </div>

      {/* Toggle tipů */}
      <button
        onClick={() => { setOpen(o => !o); if (!open && bets.length === 0) fetchBets() }}
        style={{ width: '100%', padding: '7px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span>👀 Tipy ostatních</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '6px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>Načítám…</p>
          ) : (
            <div>
              {bets.map((b, i) => {
                const ok = trefil(b)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: ok === true ? 'rgba(74,222,128,0.06)' : ok === false ? 'rgba(196,18,48,0.06)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px' }}>{ok === true ? '✅' : ok === false ? '❌' : '🎯'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{b.profiles?.prezdivka ?? '?'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: ok === true ? '#4ade80' : 'rgba(255,255,255,0.7)' }}>
                        {b.tip_domaci} : {b.tip_hosti}
                      </span>
                      {ok === true && b.vyhra > 0 && (
                        <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700 }}>+{b.vyhra} Kč</span>
                      )}
                    </div>
                  </div>
                )
              })}
              {bets.length === 0 && (
                <p style={{ textAlign: 'center', padding: '16px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>Žádné tipy</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
