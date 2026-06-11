import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { formatKc } from '../lib/utils'

const TABS = ['Hráči', 'Zápasy', 'Výsledky', 'Jackpot']

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const navigate    = useNavigate()
  const [tab, setTab]         = useState('Hráči')
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [jackpot, setJackpot] = useState(0)
  const [loading, setLoading] = useState(true)
  const [settle, setSettle]   = useState({})
  const [msg, setMsg]         = useState('')
  const [depositPlayer, setDepositPlayer] = useState(null)
  const [depositAmt,    setDepositAmt]    = useState('')

  useEffect(() => { if (!isAdmin) navigate('/'); else fetchAll() }, [isAdmin])

  async function fetchAll() {
    setLoading(true)
    const [{ data: prof }, { data: m }, { data: j }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('matches').select('*, domaci:tym_domaci(nazev), hosti:tym_hosti(nazev)').order('vykop'),
      supabase.from('jackpot').select('zustatek').single(),
    ])
    setPlayers(prof ?? [])
    setMatches(m ?? [])
    setJackpot(j?.zustatek ?? 0)
    setLoading(false)
  }

  async function handleBan(id, banned) {
    await supabase.from('profiles').update({ je_banned: !banned, banned_until: null }).eq('id', id)
    setMsg(!banned ? 'Hráč zabanován (trvalý)' : 'Ban zrušen')
    setTimeout(() => setMsg(''), 2000)
    fetchAll()
  }

  async function handleBan24h(id) {
    const until = new Date(Date.now() + 24*60*60*1000).toISOString()
    await supabase.from('profiles').update({ je_banned: true, banned_until: until }).eq('id', id)
    setMsg('Hráč zabanován na 24 hodin')
    setTimeout(() => setMsg(''), 2000)
    fetchAll()
  }

  async function handleDeposit(playerId) {
    const amt = parseInt(depositAmt, 10)
    if (isNaN(amt) || amt === 0) return
    const player = players.find(p => p.id === playerId)
    const newKredit = (player?.kredit ?? 0) + amt
    await supabase.from('profiles').update({ kredit: newKredit }).eq('id', playerId)
    setDepositPlayer(null)
    setDepositAmt('')
    setMsg(`Záloha ${amt} Kč připsána`)
    setTimeout(() => setMsg(''), 2000)
    fetchAll()
  }

  async function settleMatch(matchId, domaci, hosti) {
    const s = settle[matchId]
    if (!s?.domaci?.toString() || !s?.hosti?.toString()) return
    setMsg('Vyhodnocuji...')
    const { error } = await supabase.rpc('settle_match', {
      p_match_id:     matchId,
      p_skore_domaci: parseInt(s.domaci, 10),
      p_skore_hosti:  parseInt(s.hosti,  10),
    })
    if (error) { setMsg('Chyba: ' + error.message); return }
    setMsg('Zápas vyhodnocen ✅')
    setTimeout(() => setMsg(''), 3000)
    fetchAll()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', fontSize: '40px' }}>⚙️</div>

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: '20px', color: '#fff', margin: '0 0 4px' }}>⚙️ Admin panel</h1>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
        Jackpot: <strong style={{ color: '#e8a020' }}>{jackpot} Kč</strong> · Hráčů: <strong style={{ color: '#00b4c8' }}>{players.length}</strong>
      </p>

      {msg && <div style={{ marginBottom: '12px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#4ade80' }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
              background: tab===t ? '#e8a020' : 'rgba(255,255,255,0.08)', color: tab===t ? '#000' : 'rgba(255,255,255,0.6)' }}>
            {t}
          </button>
        ))}
      </div>

      {/* === HRÁČI === */}
      {tab === 'Hráči' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {players.map(p => (
            <div key={p.id} style={{ background: p.je_banned ? 'rgba(196,18,48,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${p.je_banned ? 'rgba(196,18,48,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{p.prezdivka}</span>
                  {p.je_admin && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e8a020', color: '#000', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>ADMIN</span>}
                  {p.je_banned && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(196,18,48,0.5)', color: '#ff8080', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>{p.banned_until ? '24h BAN' : 'BAN'}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setDepositPlayer(p.id === depositPlayer ? null : p.id)}
                    style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,180,200,0.4)', background: 'rgba(0,180,200,0.1)', color: '#00b4c8', cursor: 'pointer', fontWeight: 600 }}>
                    💰 Záloha
                  </button>
                  {!p.je_admin && !p.je_banned && (
                    <>
                      <button onClick={() => handleBan24h(p.id)}
                        style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,165,0,0.4)', background: 'rgba(255,165,0,0.1)', color: '#ffa500', cursor: 'pointer', fontWeight: 600 }}>
                        ⏱ 24h
                      </button>
                      <button onClick={() => handleBan(p.id, false)}
                        style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(196,18,48,0.4)', background: 'rgba(196,18,48,0.1)', color: '#ff8080', cursor: 'pointer', fontWeight: 600 }}>
                        🚫 Ban
                      </button>
                    </>
                  )}
                  {!p.je_admin && p.je_banned && (
                    <button onClick={() => handleBan(p.id, true)}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.15)', color: '#4ade80', cursor: 'pointer', fontWeight: 600, fontStyle: 'normal' }}>
                      ✅ Unban
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>{p.jmeno} {p.prijmeni}</span>
                {p.telefon && <span>📱 {p.telefon}</span>}
                <span>💰 Kredit: <strong style={{ color: (p.kredit ?? 0) >= 0 ? '#4ade80' : '#ff8080' }}>{p.kredit ?? 0} Kč</strong></span>
              </div>
              {depositPlayer === p.id && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" placeholder="Kč (- pro odepsání)"
                    value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '13px' }} />
                  <button onClick={() => handleDeposit(p.id)}
                    style={{ padding: '7px 14px', borderRadius: '8px', background: '#e8a020', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                    Přidat
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* === VÝSLEDKY === */}
      {tab === 'Výsledky' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {matches.filter(m => !m.vyhodnoceno && new Date(m.vykop) < new Date()).map(m => (
            <div key={m.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
                {m.domaci?.nazev} vs {m.hosti?.nazev}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" min="0" max="30" placeholder="0"
                  value={settle[m.id]?.domaci ?? ''}
                  onChange={e => setSettle(s => ({ ...s, [m.id]: { ...s[m.id], domaci: e.target.value } }))}
                  style={{ width: '60px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '18px', fontWeight: 700, textAlign: 'center' }} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>:</span>
                <input type="number" min="0" max="30" placeholder="0"
                  value={settle[m.id]?.hosti ?? ''}
                  onChange={e => setSettle(s => ({ ...s, [m.id]: { ...s[m.id], hosti: e.target.value } }))}
                  style={{ width: '60px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '18px', fontWeight: 700, textAlign: 'center' }} />
                <button onClick={() => settleMatch(m.id, settle[m.id]?.domaci, settle[m.id]?.hosti)}
                  style={{ flex: 1, padding: '9px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #e8a020, #c87010)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                  Vyhodnotit
                </button>
              </div>
            </div>
          ))}
          {matches.filter(m => !m.vyhodnoceno && new Date(m.vykop) < new Date()).length === 0 && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>Žádné zápasy k vyhodnocení</p>
          )}
        </div>
      )}

      {/* === ZÁPASY === */}
      {tab === 'Zápasy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {matches.slice(0, 30).map(m => (
            <div key={m.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#fff' }}>{m.domaci?.nazev} vs {m.hosti?.nazev}</span>
              <span style={{ color: m.vyhodnoceno ? '#4ade80' : 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                {m.vyhodnoceno ? `${m.skore_domaci}:${m.skore_hosti} ✅` : new Date(m.vykop).toLocaleDateString('cs-CZ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* === JACKPOT === */}
      {tab === 'Jackpot' && (
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>💰</div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#e8a020' }}>{jackpot} Kč</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Přechází mezi zápasy, po finále se rozdělí</div>
        </div>
      )}
    </div>
  )
}
