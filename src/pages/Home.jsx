import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MatchCard from '../components/MatchCard'
import { formatKc, formatKcAbs } from '../lib/utils'
import SindaWidget from '../components/SindaWidget'

export default function Home() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [jackpot,   setJackpot]   = useState(null)
  const [nextMatch,  setNextMatch]  = useState(null)
  const [nextBank,   setNextBank]   = useState(0)
  const [upcoming,  setUpcoming]  = useState([])
  const [standings, setStandings] = useState([])
  const [myBets,    setMyBets]    = useState({})
  const [myStats,   setMyStats]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [ended,     setEnded]     = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchJackpot(), fetchNextMatch(), fetchUpcoming(), fetchStandings(), fetchMyBets(), fetchMyStats(), fetchEnded()])
      .finally(() => setLoading(false))
  }, [user])

  async function fetchEnded() {
    const { data } = await supabase.from('tournament_state').select('ukonceno').single()
    setEnded(!!data?.ukonceno)
  }

  async function fetchJackpot() {
    const { data } = await supabase.from('jackpot').select('zustatek').single()
    setJackpot(data?.zustatek ?? 0)
  }

  async function fetchNextMatch() {
    // Najít nejbližší zápas
    const { data: m } = await supabase
      .from('matches')
      .select('*, domaci:tym_domaci(nazev), hosti:tym_hosti(nazev)')
      .gte('vykop', new Date().toISOString())
      .eq('vyhodnoceno', false)
      .order('vykop')
      .limit(1)
      .single()
    if (!m) return
    setNextMatch(m)
    // Součet sázek na tento zápas
    const { data: betsSum } = await supabase
      .from('bets')
      .select('castka')
      .eq('match_id', m.id)
    const sum = (betsSum ?? []).reduce((a, b) => a + (b.castka ?? 0), 0)
    setNextBank(sum)
  }
  async function fetchUpcoming() {
    const { data } = await supabase
      .from('matches')
      .select('*, domaci:tym_domaci(id,nazev,vlajka_url), hosti:tym_hosti(id,nazev,vlajka_url)')
      .gte('vykop', new Date().toISOString()).eq('vyhodnoceno', false).order('vykop').limit(3)
    setUpcoming(data ?? [])
  }
  async function fetchStandings() {
    const { data } = await supabase.rpc('get_player_standings')
    setStandings(data ?? [])
  }
  async function fetchMyBets() {
    const { data } = await supabase.from('bets').select('*').eq('user_id', user.id)
    const map = {}
    ;(data ?? []).forEach(b => { map[b.match_id] = b })
    setMyBets(map)
  }
  async function fetchMyStats() {
    const { data } = await supabase.rpc('get_my_stats', { p_user_id: user.id })
    setMyStats(data?.[0] ?? null)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}><div style={{ fontSize: '40px' }}>⚽</div></div>

  const top3   = standings.slice(0, 3)
  const myRank = standings.find(r => r.id === user.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Dlaždice — kompletní vyhodnocení (po skončení turnaje) */}
      {ended && (
        <button onClick={() => navigate('/vyhodnoceni')}
          style={{ width: '100%', padding: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, #e8a020, #c87010)', border: 'none', cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 20px rgba(232,160,32,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>🏁 Turnaj skončil · Španělsko mistrem světa</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#000', lineHeight: 1.1 }}>Kompletní vyhodnocení</div>
            <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '3px' }}>Výherci, jackpot, konečný žebříček a Šinďova vokna →</div>
          </div>
          <span style={{ fontSize: '34px' }}>🏆</span>
        </button>
      )}

      {/* Banner - v dalším zápase se hraje o */}
      {!ended && nextMatch && (
        <div style={{ background: 'linear-gradient(135deg, #e8a020, #d4900a)', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 4px 20px rgba(232,160,32,0.3)' }}>
          <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>
            ⚽ V dalším zápase se hraje o
          </p>
          <p style={{ fontSize: '32px', fontWeight: 900, color: '#000', margin: '0 0 2px', lineHeight: 1 }}>
            {formatKcAbs((jackpot ?? 0) + nextBank)}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)', margin: '0 0 6px' }}>
            {nextMatch.domaci?.nazev} vs {nextMatch.hosti?.nazev}
          </p>
          {nextBank > 0 && jackpot > 0 && (
            <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)', margin: 0 }}>
              Jackpot {formatKcAbs(jackpot)} + sázky {formatKcAbs(nextBank)}
            </p>
          )}
        </div>
      )}
      {!ended && !nextMatch && jackpot !== null && (
        <div style={{ background: 'linear-gradient(135deg, #e8a020, #d4900a)', borderRadius: '16px', padding: '16px 18px' }}>
          <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>💰 Jackpot</p>
          <p style={{ fontSize: '32px', fontWeight: 900, color: '#000', margin: 0 }}>{formatKcAbs(jackpot)}</p>
        </div>
      )}

      {/* Šinděovo vtipný vokno */}
      <SindaWidget />

      {/* Moje statistiky */}
      {myStats && (
        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>
            📊 Moje statistiky {myRank ? `· #${myRank.poradi} v žebříčku` : ''}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[
              [formatKc(myStats.zisk), 'Zisk / ztráta', Number(myStats.zisk) > 0 ? '#4ade80' : Number(myStats.zisk) < 0 ? '#f87171' : '#fff'],
              [myStats.pocet_tipu_celkem, 'Tipů celkem', '#fff'],
              [`${myStats.uspesnost_pct}%`, 'Úspěšnost', '#e8a020'],
            ].map(([val, label, color]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(0,100,200,0.15)', border: '1px solid rgba(0,150,255,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Vsazeno ({myStats.pocet_tipu_celkem} tipů)</span>
              <strong style={{ color: '#fff' }}>{formatKcAbs(myStats.vsazeno_celkem)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: 'rgba(255,255,255,0.55)' }}>
              <span>✅ Vyhodnoceno: {myStats.pocet_vyhodnocenych}</span>
              <span>{formatKcAbs(myStats.vyhrano_celkem)} výhry</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Čeká: {myStats.pocet_nevyhodnocenych} zápasů</div>
          </div>
        </div>
      )}

      {/* Dlouhodobé tipy — rychlý přístup */}
      <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(232,160,32,0.2)', borderRadius: '16px', padding: '14px 16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>🎯 Dlouhodobé tipy · uzávěrka 11. 6. 21:00</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => navigate('/dlouhodoby')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.25)', borderRadius: '10px', cursor: 'pointer', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🏆</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Vítěz MS 2026</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Vsadit na celkového vítěze turnaje</div>
              </div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8a020', whiteSpace: 'nowrap' }}>20 Kč →</span>
          </button>
          <button onClick={() => navigate('/dlouhodoby')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,180,200,0.08)', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '10px', cursor: 'pointer', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚽</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Nejlepší střelec</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Vsadit na krále střelců turnaje</div>
              </div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#00b4c8', whiteSpace: 'nowrap' }}>20 Kč →</span>
          </button>
        </div>
      </div>

      {/* Nejbližší zápasy */}
      {upcoming.length > 0 && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 12px' }}>Nadcházející zápasy</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.map(m => <MatchCard key={m.id} match={m} myBet={myBets[m.id]} />)}
          </div>
          <button style={{ marginTop: '10px', width: '100%', color: '#00b4c8', fontWeight: 600, fontSize: '13px', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/zapasy')}>
            Zobrazit všechny zápasy →
          </button>
        </div>
      )}

      {/* Žebříček top 3 */}
      {top3.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#fff', margin: 0 }}>🏆 Žebříček</h2>
            <button style={{ color: '#00b4c8', fontWeight: 600, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/zebricek')}>Vše →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {top3.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: p.id === user.id ? 'rgba(232,160,32,0.1)' : 'rgba(255,255,255,0.04)', border: p.id === user.id ? '1px solid rgba(232,160,32,0.3)' : '1px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{p.prezdivka}{p.id === user.id && <span style={{ color: '#e8a020', fontSize: '11px', marginLeft: '4px' }}>(já)</span>}</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: Number(p.zisk) > 0 ? '#4ade80' : Number(p.zisk) < 0 ? '#f87171' : 'rgba(255,255,255,0.5)' }}>{formatKc(p.zisk)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
