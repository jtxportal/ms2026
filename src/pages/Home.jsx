import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import MatchCard from '../components/MatchCard'
import { formatKc, formatKcAbs } from '../lib/utils'

export default function Home() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [jackpot,   setJackpot]   = useState(null)
  const [upcoming,  setUpcoming]  = useState([])
  const [standings, setStandings] = useState([])
  const [myBets,    setMyBets]    = useState({})
  const [myStats,   setMyStats]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchJackpot(), fetchUpcoming(), fetchStandings(), fetchMyBets(), fetchMyStats()])
      .finally(() => setLoading(false))
  }, [user])

  async function fetchJackpot() {
    const { data } = await supabase.from('jackpot').select('zustatek').single()
    setJackpot(data?.zustatek ?? 0)
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

      {/* Jackpot */}
      <div style={{ background: 'linear-gradient(135deg, #e8a020, #d4900a)', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 20px rgba(232,160,32,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>💰 Jackpot</p>
            <p style={{ fontSize: '30px', fontWeight: 900, color: '#000', margin: '0 0 4px' }}>{formatKcAbs(jackpot)}</p>
            <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', margin: 0 }}>Přechází na příští nevyhodnocený zápas</p>
          </div>
          <div style={{ fontSize: '48px' }}>🏆</div>
        </div>
      </div>

      {/* Pravidla — rozklikávací s lepším kontrastem */}
      <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' }}>
        <button
          onClick={() => setShowRules(r => !r)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>Pravidla soutěže</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}>{showRules ? '▲' : '▼'}</span>
        </button>

        {showRules && (
          <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>

            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, margin: '0 0 14px' }}>
              Soukromá tipovačka pro kamarády a fanoušky <strong style={{ color: '#00b4c8' }}>AFK Kácov</strong>.
              Nejde o žádnou sázkovou kancelář ani o podnikání — vše se přerozdělí mezi účastníky. Nikdo nic nebere pro sebe.
            </p>

            {/* Jak to funguje */}
            <div style={{ background: 'rgba(0,180,200,0.12)', border: '1px solid rgba(0,180,200,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
              <p style={{ fontWeight: 700, color: '#00b4c8', fontSize: '13px', margin: '0 0 6px' }}>⚽ Jak se tipuje</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
                Tipuje se <strong style={{ color: '#fff' }}>přesný výsledek po základní hrací době</strong>. Prodloužení ani penalty se nezapočítávají.
              </p>
            </div>

            {/* Sázky */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
              <p style={{ fontWeight: 700, color: '#e8a020', fontSize: '13px', margin: '0 0 8px' }}>💰 Výše sázek</p>
              {[['Skupiny', '10 Kč'], ['1/32, 1/16, osmifinále, čtvrtfinále', '20 Kč'], ['Semifinále', '50 Kč'], ['Finále', '100 Kč'], ['Vítěz MS + nejlepší střelec', '20 Kč']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>{k}</span>
                  <strong style={{ color: '#fff' }}>{v}</strong>
                </div>
              ))}
            </div>

            {/* Bank */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
              <p style={{ fontWeight: 700, color: '#e8a020', fontSize: '13px', margin: '0 0 6px' }}>🏦 Bank zápasu</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: '0 0 6px', lineHeight: 1.5 }}>
                Bank = součet sázek na daný zápas. Rozdělí se rovným dílem mezi výherce. Nikdo netrefí → přechází do jackpotu.
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Příklad: 30 hráčů × 10 Kč = 300 Kč. Trefí 3 hráči → každý dostane 100 Kč.
              </p>
            </div>

            {/* Změna tipu */}
            <div style={{ background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
              <p style={{ fontWeight: 700, color: '#e8a020', fontSize: '13px', margin: '0 0 6px' }}>✏️ Změna tipu</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
                Každý tip lze <strong style={{ color: '#fff' }}>jednou změnit</strong> před výkopem. Po zahájení je uzamčen.
              </p>
            </div>

            {/* Jackpot po finále */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
              <p style={{ fontWeight: 700, color: '#e8a020', fontSize: '13px', margin: '0 0 6px' }}>🏆 Jackpot po finále</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                <strong style={{ color: '#fff' }}>1. místo 50%</strong> · <strong style={{ color: '#fff' }}>2. místo 33%</strong> · <strong style={{ color: '#fff' }}>3. místo 17%</strong>
              </p>
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '8px 0 0' }}>
              Registrací potvrzuješ závazek uhradit záporný zůstatek. Organizátoři si neodečítají provizi.
            </p>
          </div>
        )}
      </div>

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
