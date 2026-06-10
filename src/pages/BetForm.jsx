import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime, isBeforeKickoff, FAZE_LABEL, FAZE_CENA } from '../lib/utils'

const S = {
  card: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px' },
  input: { width: '80px', height: '80px', fontSize: '36px', fontWeight: 900, textAlign: 'center', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.25)', borderRadius: '16px', color: '#fff', outline: 'none', display: 'block' },
  btn: { width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #e8a020, #c87010)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '15px' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
}

export default function BetForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [match,   setMatch]   = useState(null)
  const [myBet,   setMyBet]   = useState(null)
  const [tipD,    setTipD]    = useState('')
  const [tipH,    setTipH]    = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  useEffect(() => { if (user) fetchData() }, [id, user])

  async function fetchData() {
    setLoading(true)
    const [{ data: m }, { data: b }] = await Promise.all([
      supabase.from('matches').select('*, domaci:tym_domaci(id,nazev,vlajka_url), hosti:tym_hosti(id,nazev,vlajka_url)').eq('id', id).single(),
      supabase.from('bets').select('*').eq('match_id', id).eq('user_id', user.id).maybeSingle(),
    ])
    setMatch(m)
    setMyBet(b)
    if (b) { setTipD(String(b.tip_domaci)); setTipH(String(b.tip_hosti)) }
    setLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', fontSize: '40px' }}>⚽</div>
  if (!match)  return <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>Zápas nenalezen</div>

  const locked         = !isBeforeKickoff(match.vykop)
  const alreadyChanged = myBet && myBet.update_count >= 1
  const cena           = FAZE_CENA[match.faze] ?? 10
  const nazevD = match.domaci?.nazev ?? '?'
  const nazevH = match.hosti?.nazev  ?? '?'
  const flagD  = match.domaci?.vlajka_url
  const flagH  = match.hosti?.vlajka_url

  async function handleSubmit(e) {
    e.preventDefault()
    if (locked || alreadyChanged) return
    setError('')
    const d = parseInt(tipD, 10)
    const h = parseInt(tipH, 10)
    if (isNaN(d)||isNaN(h)||d<0||h<0||d>30||h>30) { setError('Zadej platné skóre (0–30).'); return }
    setSaving(true)
    try {
      if (myBet) {
        const { error: err } = await supabase.from('bets').update({ tip_domaci: d, tip_hosti: h }).eq('id', myBet.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('bets').insert({ match_id: Number(id), user_id: user.id, tip_domaci: d, tip_hosti: h })
        if (err) throw err
      }
      setDone(true)
      setTimeout(() => navigate(-1), 1200)
    } catch (err) {
      setError(err.message?.includes('vykop') ? 'Zápas již začal.' : (err.message ?? 'Chyba při ukládání.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '360px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        ← Zpět
      </button>

      {/* Info o zápasu */}
      <div style={{ ...S.card, marginBottom: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
          {match.faze === 'skupina' ? `Skupina ${match.skupina}` : (FAZE_LABEL[match.faze] ?? match.faze)}
          {' · '}{formatDateTime(match.vykop)} CEST
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '8px 0' }}>
          <div style={{ textAlign: 'center' }}>
            {flagD && <img src={flagD} alt={nazevD} style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />}
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{nazevD}</div>
          </div>
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>vs</div>
          <div style={{ textAlign: 'center' }}>
            {flagH && <img src={flagH} alt={nazevH} style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />}
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{nazevH}</div>
          </div>
        </div>
        <div style={{ marginTop: '10px', background: 'rgba(232,160,32,0.15)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '8px', padding: '4px 12px', display: 'inline-block', fontSize: '12px', fontWeight: 700, color: '#e8a020' }}>
          Sázka: {cena} Kč
        </div>
      </div>

      {/* Uzamčeno */}
      {locked ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
          <p style={{ fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Zápas již začal</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Tipy jsou uzamčeny</p>
          {myBet && <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: 700, color: '#e8a020' }}>Tvůj tip: {myBet.tip_domaci} : {myBet.tip_hosti}</p>}
        </div>

      ) : alreadyChanged ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
          <p style={{ fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Tip již byl změněn</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 16px' }}>Každý tip lze změnit pouze jednou.</p>
          <div style={{ background: 'rgba(0,180,200,0.1)', border: '1px solid rgba(0,180,200,0.3)', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: '#00b4c8' }}>
            Aktuální tip: {myBet.tip_domaci} : {myBet.tip_hosti}
          </div>
        </div>

      ) : done ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: '50px', marginBottom: '12px' }}>✅</div>
          <p style={{ fontWeight: 800, fontSize: '18px', color: '#4ade80', margin: 0 }}>Tip uložen!</p>
        </div>

      ) : (
        <form onSubmit={handleSubmit} style={S.card}>
          <h2 style={{ fontWeight: 700, fontSize: '16px', color: '#fff', textAlign: 'center', margin: '0 0 16px' }}>
            {myBet ? 'Upravit tip' : 'Zadat tip'}
          </h2>

          {myBet && myBet.update_count === 0 && (
            <div style={{ marginBottom: '14px', background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#e8a020', textAlign: 'center' }}>
              ⚠️ Tip můžeš změnit ještě <strong>jednou</strong> před výkopem
            </div>
          )}

          {error && <div style={{ marginBottom: '14px', background: 'rgba(196,18,48,0.2)', border: '1px solid rgba(196,18,48,0.4)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#ff8080' }}>{error}</div>}

          {/* Velká pole pro skóre */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', maxWidth: '80px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nazevD}</span>
              <input type="number" min="0" max="30" style={S.input} value={tipD} onChange={e => setTipD(e.target.value)} required />
            </div>
            <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.2)', fontWeight: 300, marginTop: '24px' }}>:</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', maxWidth: '80px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nazevH}</span>
              <input type="number" min="0" max="30" style={S.input} value={tipH} onChange={e => setTipH(e.target.value)} required />
            </div>
          </div>

          {/* Rychlé předvolby */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>Oblíbené výsledky</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' }}>
              {[['1','0'],['2','1'],['2','0'],['1','1'],['0','1'],['0','2'],['3','1'],['3','0']].map(([d,h]) => (
                <button key={`${d}-${h}`} type="button"
                  onClick={() => { setTipD(d); setTipH(h) }}
                  style={{
                    padding: '7px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', border: '1px solid',
                    background: tipD===d&&tipH===h ? '#e8a020' : 'rgba(255,255,255,0.08)',
                    color: tipD===d&&tipH===h ? '#000' : '#fff',
                    borderColor: tipD===d&&tipH===h ? '#e8a020' : 'rgba(255,255,255,0.15)',
                  }}
                >{d}:{h}</button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ ...S.btn, ...(saving ? S.btnDisabled : {}) }}>
            {saving ? 'Ukládám…' : myBet ? 'Změnit tip (poslední možnost!)' : `Vsadit ${cena} Kč`}
          </button>

          {myBet && (
            <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              Aktuální tip: {myBet.tip_domaci} : {myBet.tip_hosti}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
