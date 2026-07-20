import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Účet bankéře (Bob) pro závěrečné vyrovnání — QR Platba (SPD)
const VYROVNANI_IBAN = 'CZ5780400000007301006002'
const VYROVNANI_UCET = '7301006002/8040'

// ============================================================
// KOMPLETNÍ VYHODNOCENÍ TURNAJE (route /vyhodnoceni)
// Zobrazuje se po skončení turnaje (tournament_state.ukonceno).
// Data: rpc get_final_report() + get_player_standings() + admin_notices
// ============================================================

const MEDALS = {
  '1_misto_50pct': { medal: '🥇', label: '1. místo', pct: '50 %' },
  '2_misto_33pct': { medal: '🥈', label: '2. místo', pct: '33 %' },
  '3_misto_17pct': { medal: '🥉', label: '3. místo', pct: '17 %' },
}

function LongtermResultCard({ icon, title, result, bets, myPrezdivka }) {
  const bank    = bets.reduce((a, b) => a + (b.castka ?? 0), 0)
  const winners = bets.filter(b => Number(b.vyhra) > 0)

  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '16px', padding: '16px', borderLeft: '3px solid #e8a020' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#e8a020', margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>{result}</p>

      {/* Tabulka tipů */}
      <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
        {bets.map((b, i) => {
          const won  = Number(b.vyhra) > 0
          const isMe = b.prezdivka === myPrezdivka
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 14px', borderBottom: i < bets.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: won ? 'rgba(74,222,128,0.08)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px' }}>{won ? '✅' : '❌'}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                  {b.prezdivka}{isMe && <span style={{ color: '#e8a020', fontSize: '11px', marginLeft: '4px' }}>(já)</span>}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: won ? 700 : 500, color: won ? '#4ade80' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.hodnota}
                </span>
                {won && <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700, whiteSpace: 'nowrap' }}>+{b.vyhra} Kč</span>}
              </div>
            </div>
          )
        })}
        {bets.length === 0 && (
          <p style={{ textAlign: 'center', padding: '14px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>Žádné tipy</p>
        )}
      </div>

      {/* Bank */}
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
        Bank: {bets.length} × 20 Kč = <strong style={{ color: '#e8a020' }}>{bank} Kč</strong>
        {winners.length > 0
          ? <> · rozděleno mezi {winners.length === 1 ? 'jediného výherce' : `${winners.length} výherce`}{winners.length > 1 ? ` po ${winners[0].vyhra} Kč` : ` (${winners[0].vyhra} Kč)`}</>
          : <> · nikdo netrefil → bank přešel do jackpotu 🎰</>}
      </p>
    </div>
  )
}

// Osobní vyrovnání přihlášeného hráče + QR Platba pro dlužníky
function MojeVyrovnani({ user, prezdivka }) {
  const [saldo, setSaldo] = useState(null)
  const [qr,    setQr]    = useState(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [b, l, j] = await Promise.all([
        supabase.from('bets').select('castka, vyhra').eq('user_id', user.id),
        supabase.from('longterm_bets').select('castka, vyhra').eq('user_id', user.id),
        supabase.from('jackpot_payouts').select('castka').eq('user_id', user.id),
      ])
      const s = (res, f) => (res.data ?? []).reduce((x, r) => x + (r[f] ?? 0), 0)
      const v = s(b, 'vyhra') + s(l, 'vyhra') + s(j, 'castka') - s(b, 'castka') - s(l, 'castka')
      setSaldo(v)
      if (v < 0) {
        const nick = (prezdivka ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
        const spd = `SPD*1.0*ACC:${VYROVNANI_IBAN}*AM:${-v}.00*CC:CZK*RN:ROBERT NEJEDLY*MSG:TIPOVACKA MS 2026 - ${nick}`
        try { setQr(await QRCode.toDataURL(spd, { width: 260, margin: 2 })) } catch (e) { /* QR se nepovedl — zobrazíme jen účet */ }
      }
    })()
  }, [user])

  if (saldo === null) return null

  const border = saldo < 0 ? 'rgba(196,18,48,0.4)' : saldo > 0 ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.15)'
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>
        💳 Moje vyrovnání
      </p>
      <p style={{ fontSize: '30px', fontWeight: 900, margin: '0 0 4px', color: saldo < 0 ? '#ff8080' : saldo > 0 ? '#4ade80' : 'rgba(255,255,255,0.7)' }}>
        {saldo > 0 ? '+' : ''}{saldo} Kč
      </p>
      {saldo < 0 && (
        <>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0 0 12px' }}>
            Naskenuj QR v bankovní appce a pošli {-saldo} Kč na účet tipovačky ({VYROVNANI_UCET}).
          </p>
          {qr && (
            <img src={qr} alt="QR Platba"
              style={{ width: '220px', maxWidth: '80%', borderRadius: '12px', background: '#fff', padding: '6px' }} />
          )}
        </>
      )}
      {saldo > 0 && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          Gratulace! 🎉 Pošli Bobovi číslo účtu a částka ti přijde.
        </p>
      )}
      {saldo === 0 && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Jsi vyrovnaný — nula od nuly pojde. 👌
        </p>
      )}
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '10px 0 0' }}>
        Saldo = vyhráno (zápasy + dlouhodobé + jackpot) − vsazeno · po zaplacení ti Bob odškrtne
      </p>
    </div>
  )
}

export default function FinalReport() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [report,    setReport]    = useState(null)
  const [standings, setStandings] = useState([])
  const [notices,   setNotices]   = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.rpc('get_final_report'),
      supabase.rpc('get_player_standings'),
      supabase.from('admin_notices').select('*').order('created_at', { ascending: false }),
    ]).then(([rep, st, no]) => {
      setReport(rep.data ?? null)
      setStandings(st.data ?? [])
      setNotices(no.data ?? [])
      setLoading(false)
    })
  }, [user])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div style={{ fontSize: '40px' }}>🏁</div></div>

  if (!report?.ukonceno) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>⏳</div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0 }}>
          Turnaj ještě není vyhodnocen — vyhodnocení se tu objeví po finále.
        </p>
      </div>
    )
  }

  const myPrezdivka  = profile?.prezdivka
  const vitezBets    = (report.longterm ?? []).filter(b => b.typ === 'vitez')
  const strelecBets  = (report.longterm ?? []).filter(b => b.typ === 'strelec')
  const payouts      = report.payouts ?? []
  const jackpotTotal = payouts.reduce((a, p) => a + (p.castka ?? 0), 0) + (report.jackpot_zustatek ?? 0)
  const top3         = standings.filter(s => Number(s.poradi) <= 3)

  function fmtDate(iso) {
    return new Date(iso).toLocaleString('cs-CZ', {
      day: 'numeric', month: 'numeric', year: 'numeric',
      timeZone: 'Europe/Prague',
    })
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontWeight: 900, fontSize: '22px', color: '#fff', margin: '0 0 4px' }}>Kompletní vyhodnocení 🏁</h1>
        <p style={{ fontSize: '13px', color: '#00b4c8', margin: 0 }}>Tipovačka MS 2026 · AFK Kácov</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '24px' }}>

        {/* Moje vyrovnání + QR platba */}
        <MojeVyrovnani user={user} prezdivka={myPrezdivka} />

        {/* Hero — mistr světa */}
        <div style={{ background: 'linear-gradient(135deg, #e8a020, #c87010)', borderRadius: '18px', padding: '20px 18px', textAlign: 'center', boxShadow: '0 4px 24px rgba(232,160,32,0.35)' }}>
          <div style={{ fontSize: '44px', lineHeight: 1, marginBottom: '6px' }}>🏆</div>
          <p style={{ color: 'rgba(0,0,0,0.55)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px' }}>
            Mistr světa 2026
          </p>
          <p style={{ fontSize: '30px', fontWeight: 900, color: '#000', margin: '0 0 6px', lineHeight: 1.1 }}>
            {report.vitez_ms}
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', margin: 0, lineHeight: 1.5 }}>
            Finále: Španělsko – Argentina 1:0 po prodloužení<br />
            (0:0 po základní době) · O 3. místo: Anglie – Francie 6:4
          </p>
        </div>

        {/* 1. Vítěz MS */}
        <LongtermResultCard
          icon="🏆" title="Vítěz MS 2026"
          result={report.vitez_ms}
          bets={vitezBets} myPrezdivka={myPrezdivka}
        />

        {/* 2. Nejlepší střelec */}
        <LongtermResultCard
          icon="⚽" title="Nejlepší střelec turnaje"
          result={report.nejlepsi_strelec}
          bets={strelecBets} myPrezdivka={myPrezdivka}
        />

        {/* 3. Rozdělení jackpotu */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '16px', padding: '16px', borderLeft: '3px solid #e8a020' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>💰</span>
            <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#e8a020', margin: 0 }}>Rozdělení jackpotu</h2>
          </div>
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <p style={{ fontSize: '34px', fontWeight: 900, color: '#e8a020', margin: 0, lineHeight: 1 }}>{jackpotTotal} Kč</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
              nerozdělený bank po finále · dle pravidel top 3 konečného žebříčku
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {payouts.map((p, i) => {
              const m = MEDALS[p.duvod] ?? { medal: '🎖', label: p.duvod, pct: '' }
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: 'rgba(232,160,32,0.07)', border: '1px solid rgba(232,160,32,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{m.medal}</span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                        {p.prezdivka}{p.prezdivka === myPrezdivka && <span style={{ color: '#e8a020', fontSize: '11px', marginLeft: '4px' }}>(já)</span>}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>{m.label}{m.pct && ` · ${m.pct}`}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#4ade80', whiteSpace: 'nowrap' }}>+{p.castka} Kč</span>
                </div>
              )
            })}
            {payouts.length === 0 && (
              <p style={{ textAlign: 'center', padding: '10px', color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>Jackpot zatím nebyl rozdělen</p>
            )}
          </div>
          {report.jackpot_zustatek > 0 && (
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '8px 0 0' }}>
              V jackpotu zbývá {report.jackpot_zustatek} Kč (haléřové zbytky / neobsazená místa).
            </p>
          )}
        </div>

        {/* 4. Konečný žebříček */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '16px', padding: '16px', borderLeft: '3px solid #00b4c8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#00b4c8', margin: 0 }}>Konečný žebříček</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {top3.map(p => {
              const pos = Number(p.poradi)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '17px' }}>{pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                      {p.prezdivka}{p.prezdivka === myPrezdivka && <span style={{ color: '#e8a020', fontSize: '11px', marginLeft: '4px' }}>(já)</span>}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: Number(p.zisk) > 0 ? '#4ade80' : Number(p.zisk) < 0 ? '#f87171' : 'rgba(255,255,255,0.5)' }}>
                    {Number(p.zisk) > 0 ? '+' : ''}{p.zisk} Kč
                  </span>
                </div>
              )
            })}
          </div>
          <button onClick={() => navigate('/zebricek')}
            style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(0,180,200,0.12)', border: '1px solid rgba(0,180,200,0.35)', color: '#00b4c8', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            Celý žebříček →
          </button>
        </div>

        {/* 5. Rekapitulace Šinďových voken */}
        <div style={{ background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.2)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>🎭</span>
            <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#e8a020', margin: 0 }}>Rekapitulace Šinďových voken</h2>
          </div>
          {notices.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '10px', color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>
              🦗 Žádná vokna v archivu…
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notices.map(n => (
                <div key={n.id} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(232,160,32,0.15)', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#e8a020' }}>{n.autor ?? 'Šinďa'}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(n.created_at || n.updated_at)}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{n.content}</p>
                  {n.image_url && (
                    <img src={n.image_url} alt=""
                      style={{ marginTop: '10px', width: '100%', borderRadius: '10px', maxHeight: '360px', objectFit: 'contain' }}
                      onError={e => { e.target.style.display = 'none' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Závěr */}
        <div style={{ background: 'rgba(0,180,200,0.08)', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '14px', padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0 0 6px', fontStyle: 'italic' }}>
            Díky všem za účast — zase někdy u dalšího turnaje!
          </p>
          <p style={{ fontSize: '14px', color: '#e8a020', fontWeight: 700, margin: 0 }}>
            ⚽ Sportu zdar, fotbalu zvlášť a kácovskému obzvlášť!
          </p>
        </div>
      </div>
    </div>
  )
}
