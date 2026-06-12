import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const TABS = ['Hráči', 'Výsledky', 'Okno', 'Zápasy', 'Jackpot']

export default function AdminPage() {
  const { isAdmin, user } = useAuth()
  const navigate = useNavigate()

  const [tab,       setTab]       = useState('Hráči')
  const [players,   setPlayers]   = useState([])
  const [matches,   setMatches]   = useState([])
  const [jackpot,   setJackpot]   = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [msg,       setMsg]       = useState('')
  const [settle,    setSettle]    = useState({})

  // Záloha
  const [depositPlayer, setDepositPlayer] = useState(null)
  const [depositAmt,    setDepositAmt]    = useState('')

  // Odebrání hráče
  const [deletePending, setDeletePending] = useState(null)

  // Šinďovo okno
  const [oknoText, setOknoText] = useState('')
  const [oknoImg,  setOknoImg]  = useState('')
  const [oknoId,   setOknoId]   = useState(null)
  const [oknoSaving, setOknoSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    fetchAll()
  }, [isAdmin])

  async function fetchAll() {
    setLoading(true)
    try {
      const [p, m, j, o] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at'),
        supabase.from('matches').select('*, domaci:tym_domaci(nazev), hosti:tym_hosti(nazev)').order('vykop'),
        supabase.from('jackpot').select('zustatek').single(),
        supabase.from('admin_notices').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      setPlayers(p.data ?? [])
      setMatches(m.data ?? [])
      setJackpot(j.data?.zustatek ?? 0)
      if (o.data) {
        setOknoText(o.data.content ?? '')
        setOknoImg(o.data.image_url ?? '')
        setOknoId(o.data.id)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  function flash(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 2500)
  }

  // --- BAN ---
  async function handleBan(id, currentlyBanned) {
    await supabase.from('profiles').update({ je_banned: !currentlyBanned, banned_until: null }).eq('id', id)
    flash(currentlyBanned ? 'Ban zrušen' : 'Hráč zabanován')
    fetchAll()
  }

  async function handleBan24h(id) {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('profiles').update({ je_banned: true, banned_until: until }).eq('id', id)
    flash('Hráč zabanován na 24 hodin')
    fetchAll()
  }

  // --- ZÁLOHA ---
  async function handleDeposit(playerId) {
    const amt = parseInt(depositAmt, 10)
    if (isNaN(amt) || amt === 0) return
    const player = players.find(p => p.id === playerId)
    const newKredit = (player?.kredit ?? 0) + amt
    await supabase.from('profiles').update({ kredit: newKredit }).eq('id', playerId)
    setDepositPlayer(null)
    setDepositAmt('')
    flash(`${amt > 0 ? '+' : ''}${amt} Kč připsáno`)
    fetchAll()
  }

  // --- ODEBRÁNÍ ---
  async function handleDeleteRequest(playerId) {
    await supabase.from('profiles').update({ delete_requested_by: user?.id }).eq('id', playerId)
    flash('Žádost o odebrání odeslána — čeká na druhého admina')
    fetchAll()
  }

  async function handleCancelDelete(playerId) {
    await supabase.from('profiles').update({ delete_requested_by: null }).eq('id', playerId)
    flash('Žádost zrušena')
    fetchAll()
  }

  async function handleResetPassword(playerId, prezdivka) {
    if (!window.confirm(`Resetovat heslo hráče ${prezdivka} na "chytrak"?`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ targetId: playerId }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error || 'Reset se nezdařil')
      flash(`Heslo hráče ${prezdivka} resetováno na: chytrak`)
    } catch (e) {
      flash(`Chyba: ${e.message}`)
    }
  }

  async function handleConfirmDelete(playerId, prezdivka) {
    if (!window.confirm(`Opravdu smazat hráče ${prezdivka}? Nevratná akce.`)) return
    await supabase.from('bets').delete().eq('user_id', playerId)
    await supabase.from('longterm_bets').delete().eq('user_id', playerId)
    await supabase.from('chat_messages').delete().eq('user_id', playerId)
    await supabase.from('profiles').delete().eq('id', playerId)
    flash(`Hráč ${prezdivka} odebrán`)
    fetchAll()
  }

  // --- VYHODNOCENÍ ---
  async function settleMatch(matchId) {
    const s = settle[matchId]
    if (s?.domaci === undefined || s?.hosti === undefined) return
    flash('Vyhodnocuji...')
    const { error } = await supabase.rpc('settle_match', {
      p_match_id: matchId,
      p_skore_domaci: parseInt(s.domaci, 10),
      p_skore_hosti: parseInt(s.hosti, 10),
    })
    if (error) { flash('Chyba: ' + error.message); return }
    flash('Zápas vyhodnocen ✅')
    fetchAll()
  }

  // --- OKNO ---
  async function saveOkno() {
    if (!oknoText.trim()) return
    setOknoSaving(true)
    if (oknoId) {
      await supabase.from('admin_notices').update({
        content: oknoText.trim(),
        image_url: oknoImg.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', oknoId)
    } else {
      const { data } = await supabase.from('admin_notices').insert({
        content: oknoText.trim(),
        image_url: oknoImg.trim() || null,
        autor: 'Šinďa',
      }).select().single()
      if (data) setOknoId(data.id)
    }
    flash('Šinďovo vokno uloženo ✅')
    setOknoSaving(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', fontSize: '40px' }}>⚙️</div>

  const S = {
    card: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px' },
    input: { width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' },
    btn: (color) => ({ fontSize: '11px', padding: '4px 9px', borderRadius: '6px', border: `1px solid ${color}40`, background: `${color}15`, color, cursor: 'pointer', fontWeight: 600 }),
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: '20px', color: '#fff', margin: '0 0 4px' }}>⚙️ Admin panel</h1>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 14px' }}>
        Jackpot: <strong style={{ color: '#e8a020' }}>{jackpot} Kč</strong> · Hráčů: <strong style={{ color: '#00b4c8' }}>{players.length}</strong>
      </p>

      {msg && (
        <div style={{ marginBottom: '12px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#4ade80' }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: '0 0 auto', padding: '8px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: 700,
            background: tab === t ? '#e8a020' : 'rgba(255,255,255,0.08)',
            color: tab === t ? '#000' : 'rgba(255,255,255,0.6)',
          }}>{t}</button>
        ))}
      </div>

      {/* ===== HRÁČI ===== */}
      {tab === 'Hráči' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {players.map(p => (
            <div key={p.id} style={{ ...S.card, borderColor: p.je_banned ? 'rgba(196,18,48,0.3)' : 'rgba(255,255,255,0.1)', background: p.je_banned ? 'rgba(196,18,48,0.07)' : 'rgba(255,255,255,0.06)' }}>
              {/* Řádek 1: jméno + tlačítka */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{p.prezdivka}</span>
                  {p.je_admin && <span style={{ fontSize: '10px', background: '#e8a020', color: '#000', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>ADMIN</span>}
                  {p.je_banned && <span style={{ fontSize: '10px', background: 'rgba(196,18,48,0.5)', color: '#ff8080', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>{p.banned_until ? '24h' : 'BAN'}</span>}
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDepositPlayer(depositPlayer === p.id ? null : p.id)} style={S.btn('#00b4c8')}>💰</button>
                  <button onClick={() => handleResetPassword(p.id, p.prezdivka)} style={S.btn('#e8a020')} title="Reset hesla na chytrak">🔑</button>
                  {!p.je_admin && !p.je_banned && (
                    <>
                      <button onClick={() => handleBan24h(p.id)} style={S.btn('#ffa500')}>⏱24h</button>
                      <button onClick={() => handleBan(p.id, false)} style={S.btn('#ff8080')}>🚫</button>
                    </>
                  )}
                  {!p.je_admin && p.je_banned && (
                    <button onClick={() => handleBan(p.id, true)} style={S.btn('#4ade80')}>✅ Unban</button>
                  )}
                  {!p.je_admin && !p.delete_requested_by && (
                    <button onClick={() => handleDeleteRequest(p.id)} style={S.btn('#ff6060')}>🗑</button>
                  )}
                </div>
              </div>

              {/* Řádek 2: detaily */}
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>{p.jmeno} {p.prijmeni}</span>
                {p.telefon && <span>📱 {p.telefon}</span>}
                <span>💰 <strong style={{ color: (p.kredit ?? 0) >= 0 ? '#4ade80' : '#ff8080' }}>{p.kredit ?? 0} Kč</strong></span>
              </div>

              {/* Záloha input */}
              {depositPlayer === p.id && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <input type="number" placeholder="Kč (záporné = odepsat)"
                    value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                    style={{ ...S.input, flex: 1 }} />
                  <button onClick={() => handleDeposit(p.id)} style={{ padding: '8px 14px', borderRadius: '8px', background: '#e8a020', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                    OK
                  </button>
                </div>
              )}

              {/* Žádost o odebrání */}
              {p.delete_requested_by && (
                <div style={{ marginTop: '8px', background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.25)', borderRadius: '10px', padding: '10px 12px' }}>
                  <p style={{ fontSize: '12px', color: '#ff8080', margin: '0 0 8px', fontWeight: 600 }}>⚠️ Čeká na potvrzení druhého admina</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {p.delete_requested_by !== user?.id && (
                      <button onClick={() => handleConfirmDelete(p.id, p.prezdivka)}
                        style={{ flex: 1, padding: '7px', borderRadius: '8px', background: 'rgba(196,18,48,0.7)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>
                        ✅ Potvrdit odebrání
                      </button>
                    )}
                    <button onClick={() => handleCancelDelete(p.id)}
                      style={{ flex: 1, padding: '7px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>
                      ✕ Zrušit
                    </button>
                  </div>
                  {p.delete_requested_by === user?.id && (
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '6px 0 0' }}>Ty jsi podal žádost — musí potvrdit druhý admin.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== VÝSLEDKY ===== */}
      {tab === 'Výsledky' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {matches.filter(m => !m.vyhodnoceno && new Date(m.vykop) < new Date()).length === 0 && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>Žádné zápasy k vyhodnocení</p>
          )}
          {matches.filter(m => !m.vyhodnoceno && new Date(m.vykop) < new Date()).map(m => (
            <div key={m.id} style={S.card}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
                {m.domaci?.nazev} vs {m.hosti?.nazev}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {['domaci', 'hosti'].map((side, i) => (
                  <>
                    {i === 1 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>:</span>}
                    <input key={side} type="number" min="0" max="30" placeholder="0"
                      value={settle[m.id]?.[side] ?? ''}
                      onChange={e => setSettle(s => ({ ...s, [m.id]: { ...s[m.id], [side]: e.target.value } }))}
                      style={{ width: '60px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '18px', fontWeight: 700, textAlign: 'center' }} />
                  </>
                ))}
                <button onClick={() => settleMatch(m.id)}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', background: 'linear-gradient(135deg, #e8a020, #c87010)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                  Vyhodnotit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== OKNO ===== */}
      {tab === 'Okno' && (
        <div style={{ background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '14px', padding: '16px' }}>
          <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#e8a020', margin: '0 0 14px' }}>🎭 Šinďovo vtipný vokno</h3>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>Text / vtip / zpráva</label>
            <textarea value={oknoText} onChange={e => setOknoText(e.target.value)} rows={5}
              placeholder="Napiš vtip nebo důležitou zprávu..."
              style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>URL obrázku (nepovinné)</label>
            <input value={oknoImg} onChange={e => setOknoImg(e.target.value)}
              placeholder="https://... jpg/png/gif"
              style={S.input} />
            {oknoImg && (
              <img src={oknoImg} alt="" onError={e => { e.target.style.display = 'none' }}
                style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '150px', borderRadius: '6px', objectFit: 'contain' }} />
            )}
          </div>

          <button onClick={saveOkno} disabled={!oknoText.trim() || oknoSaving}
            style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #e8a020, #c87010)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px', opacity: !oknoText.trim() ? 0.5 : 1 }}>
            {oknoSaving ? 'Ukládám…' : oknoId ? '✅ Aktualizovat vokno' : '🎭 Zveřejnit'}
          </button>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
            Zobrazí se na domovské stránce pod bannerem
          </p>
        </div>
      )}

      {/* ===== ZÁPASY ===== */}
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

      {/* ===== JACKPOT ===== */}
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
