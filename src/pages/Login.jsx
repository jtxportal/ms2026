import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MASCOTS, AFK_LOGO } from '../lib/images'

const RULES = [
  { title: 'Co to je', text: 'Soukromá tipovačka pro kamarády a fanoušky AFK Kácov. Nejde o sázkovou kancelář — vše se přerozdělí mezi účastníky.' },
  { title: 'Jak se tipuje', text: 'Přesný výsledek po základní hrací době. Prodloužení ani penalty se nezapočítávají.' },
  { title: 'Výše sázek', items: ['Skupiny: 10 Kč', '1/32 až čtvrtfinále: 20 Kč', 'Semifinále: 50 Kč', 'Finále: 100 Kč', 'Vítěz MS + nejlepší střelec: 20 Kč'] },
  { title: 'Bank zápasu', text: 'Sázky na zápas tvoří společný bank. Rozdělí se mezi výherce. Nikdo netrefí → přechází do jackpotu.' },
  { title: 'Změna tipu', text: 'Každý tip lze jednou změnit před výkopem. Po zahájení je uzamčen.' },
  { title: 'Jackpot po finále', text: '1. místo 50% · 2. místo 33% · 3. místo 17%' },
  { title: 'Chat', text: 'Turnajový chat + chat ke každému zápasu. Admini Venca Šinďa a Bob mohou hráče zabanovat.' },
  { title: 'Finanční vyrovnání', text: 'Registrací potvrzuješ závazek uhradit záporný zůstatek po MS. Organizátoři si neodečítají provizi.' },
]

export default function Login() {
  const navigate = useNavigate()
  const [prezdivka, setPrezdivka] = useState('')
  const [heslo,     setHeslo]     = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [showRules, setShowRules] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const uziv = prezdivka.trim().toLowerCase()
      // Účty z registrace mají doménu @ms2026.app, starší ručně založené @tipovacka.local.
      // Zkusíme nejdřív @ms2026.app, při neúspěchu @tipovacka.local – ať se přihlásí všichni.
      let err = (await supabase.auth.signInWithPassword({ email: `${uziv}@ms2026.app`, password: heslo })).error
      if (err) {
        err = (await supabase.auth.signInWithPassword({ email: `${uziv}@tipovacka.local`, password: heslo })).error
      }
      if (err) throw err
      navigate('/')
    } catch {
      setError('Špatná přezdívka nebo heslo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Pozadí */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${MASCOTS})`, backgroundSize: 'cover', backgroundPosition: 'center 20%', filter: 'brightness(0.55) saturate(1.3)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(4,9,28,0.1) 0%, rgba(4,9,28,0.5) 40%, rgba(4,9,28,0.95) 100%)' }} />

      {/* Rainbow stripe */}
      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />

      {/* Obsah */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: '20px' }}>

        {/* Hero sekce — AFK logo uprostřed */}
        <div style={{ textAlign: 'center' }}>
          {/* AFK logo velké uprostřed */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <img src={AFK_LOGO} alt="AFK Kácov" style={{
              width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover',
              border: '3px solid rgba(0,180,200,0.8)',
              boxShadow: '0 0 30px rgba(0,180,200,0.5), 0 0 60px rgba(0,180,200,0.2)',
            }} />
          </div>

          {/* Název */}
          <div style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif", fontWeight: 900, fontSize: '38px', lineHeight: 1, textTransform: 'uppercase', background: 'linear-gradient(160deg, #fff 0%, #f5e090 50%, #e8a020 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>
            Tipovačka
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif", fontWeight: 700, fontSize: '13px', background: 'linear-gradient(90deg, #00b4c8, #00e8d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>
            FIFA World Cup 2026
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', marginBottom: '14px' }}>
            pro kamarády a fanoušky AFK Kácov
          </div>

          {/* Tlačítko pravidla — prominentní */}
          <button
            onClick={() => setShowRules(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(232,160,32,0.2), rgba(232,160,32,0.1))',
              border: '1px solid rgba(232,160,32,0.6)',
              borderRadius: '24px', padding: '8px 22px',
              color: '#e8a020', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.5px',
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              boxShadow: '0 0 12px rgba(232,160,32,0.2)',
            }}
          >
            📋 Pravidla soutěže
          </button>
        </div>

        {/* Motto */}
        <div style={{ width: '100%', maxWidth: '320px', textAlign: 'center', padding: '0 8px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            Soukromá tipovačka pro kamarády a fanoušky <strong style={{ color: '#00b4c8' }}>AFK Kácov</strong>.
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '6px 0 0', fontStyle: 'italic', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            Peníze se přerozdělí od těch, kteří fotbalu rozumí méně,
            k těm, kterým Pánbůh nadělil lepší fotbalový odhad.
          </p>
        </div>

        {/* Přihlašovací formulář */}
        <div style={{ width: '100%', maxWidth: '320px', background: 'rgba(4,9,28,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(20px)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>Přihlásit se</h2>

          {error && <div style={{ marginBottom: '14px', background: 'rgba(196,18,48,0.2)', border: '1px solid rgba(196,18,48,0.4)', color: '#ff8080', fontSize: '13px', borderRadius: '10px', padding: '10px 14px' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '5px', letterSpacing: '1px', textTransform: 'uppercase' }}>Přezdívka</label>
              <input className="input" placeholder="PepíkMessi" value={prezdivka} onChange={e => setPrezdivka(e.target.value)} autoCapitalize="none" required />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '5px', letterSpacing: '1px', textTransform: 'uppercase' }}>Heslo</label>
              <input className="input" type="password" value={heslo} onChange={e => setHeslo(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ fontSize: '15px', padding: '12px' }}>
              {loading ? 'Přihlašuji…' : 'Přihlásit se ⚡'}
            </button>
          </form>

          <p style={{ marginTop: '14px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Nemáš účet? <Link to="/registrace" style={{ color: '#00b4c8', fontWeight: 600, textDecoration: 'none' }}>Zaregistruj se</Link>
          </p>
        </div>
      </div>

      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />

      {/* Modal — Pravidla */}
      {showRules && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(4,9,28,0.95)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowRules(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '440px', maxHeight: '88vh', background: '#0d1535', border: '1px solid rgba(232,160,32,0.25)', borderRadius: '24px 24px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(196,18,48,0.25), rgba(0,31,94,0.25))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={AFK_LOGO} alt="AFK" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,180,200,0.5)' }} />
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '15px', color: '#e8a020', letterSpacing: '1px' }}>PRAVIDLA SOUTĚŽE</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>Tipovačka MS 2026 · AFK Kácov</div>
                </div>
              </div>
              <button onClick={() => setShowRules(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Modal obsah */}
            <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#00b4c8', fontWeight: 600, marginBottom: '14px', lineHeight: 1.5 }}>
                Sportu zdar, fotbalu zvlášť a kácovskému obzvlášť! ⚽
              </p>
              {RULES.map((s, i) => (
                <div key={i} style={{ marginBottom: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8a020', marginBottom: '5px' }}>{s.title}</div>
                  {s.text && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>{s.text}</p>}
                  {s.items && <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>{s.items.map((item, j) => <li key={j} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', padding: '2px 0' }}>· {item}</li>)}</ul>}
                </div>
              ))}
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '8px' }}>
                Registrací potvrzuješ souhlas s pravidly.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
