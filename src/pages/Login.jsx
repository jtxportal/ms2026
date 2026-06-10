import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MASCOTS, AFK_LOGO, TROPHY } from '../lib/images'

const RULES_SECTIONS = [
  { title: '⚽ Co to je', text: 'Jednoduchá tipovačka výsledků MS 2026 pro kamarády. Nejde o sázkovou kancelář — všechny vložené peníze se přerozdělí mezi účastníky podle úspěšnosti.' },
  { title: '🎯 Jak se tipuje', text: 'Tipuje se přesný výsledek po základní hrací době. Prodloužení ani penalty se nezapočítávají.' },
  { title: '💰 Výše sázek', items: ['Skupiny: 10 Kč', '1/32, 1/16, osmifinále, čtvrtfinále: 20 Kč', 'Semifinále: 50 Kč', 'Finále: 100 Kč', 'Vítěz MS + nejlepší střelec: 20 Kč'] },
  { title: '🏦 Bank zápasu', text: 'Bank = součet všech sázek na daný zápas. Rozdělí se rovným dílem mezi výherce. Nikdo netrefí → bank přechází do jackpotu.' },
  { title: '✏️ Změna tipu', text: 'Každý tip lze jednou změnit před výkopem. Po zahájení zápasu je tip uzamčen.' },
  { title: '🏆 Jackpot po finále', text: 'Nerozdělený jackpot se po finále rozdělí: 1. místo 50% · 2. místo 33% · 3. místo 17%' },
  { title: '💬 Chat', text: 'Turnajový chat + chat ke každému zápasu. Slušné chování prosím. Admin Venca Šindílek a Bob mají právo hráče zabanovat.' },
  { title: '💳 Finanční vyrovnání', text: 'Registrací potvrzuješ, že po skončení MS uhradíš záporný zůstatek. Organizátoři si neodečítají žádnou provizi.' },
]

export default function Login() {
  const navigate  = useNavigate()
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
      const email = `${prezdivka.trim().toLowerCase()}@tipovacka.local`
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: heslo })
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

      {/* Pozadí — maskoti SVĚTLEJŠÍ */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${MASCOTS})`,
        backgroundSize: 'cover', backgroundPosition: 'center 20%',
        filter: 'brightness(0.62) saturate(1.3)',
      }} />
      {/* Jemnější overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(4,9,28,0.1) 0%, rgba(4,9,28,0.45) 35%, rgba(4,9,28,0.92) 100%)',
      }} />

      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />

      {/* AFK Kácov badge — vpravo nahoře */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        <img src={AFK_LOGO} alt="AFK Kácov" style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,180,200,0.7)', boxShadow: '0 0 20px rgba(0,180,200,0.5)' }} />
        <div style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(0,180,200,0.95)', textAlign: 'center', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: '0.5px', maxWidth: '80px', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          pro fanoušky<br />AFK Kácov
        </div>
      </div>

      {/* Obsah */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>

        {/* Logo + trofej */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            <img src={TROPHY} alt="MS 2026" style={{ width: '52px', height: '52px', objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(232,160,32,0.8))' }} />
            <div style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif", fontWeight: 900, fontSize: '40px', lineHeight: 1, textTransform: 'uppercase', background: 'linear-gradient(160deg, #fff 0%, #f5e090 50%, #e8a020 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none' }}>
              Tipovačka
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif", fontWeight: 700, fontSize: '15px', background: 'linear-gradient(90deg, #00b4c8, #00e8d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '4px', textTransform: 'uppercase', marginTop: '2px' }}>
            FIFA World Cup 2026
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', marginTop: '5px', textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            USA · Kanada · Mexiko
          </div>
          <button onClick={() => setShowRules(true)} style={{ marginTop: '12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '6px 18px', color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            📋 Pravidla soutěže
          </button>
        </div>

        {/* Uvítací text */}
        <div style={{ width: '100%', maxWidth: '340px', marginBottom: '14px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, textShadow: '0 1px 4px rgba(0,0,0,0.9)', margin: 0 }}>
            Soukromá tipovačka pro kamarády a fanoušky <strong style={{ color: '#00b4c8' }}>AFK Kácov</strong>.
            Nejde o sázkové podnikání — vše se přerozdělí mezi účastníky podle výsledků.
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            Podrobná pravidla najdeš po přihlášení v sekci <strong style={{ color: '#e8a020' }}>Profil → Pravidla</strong>.
          </p>
        </div>

        {/* Formulář */}
        <div style={{ width: '100%', maxWidth: '340px', background: 'rgba(4,9,28,0.75)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(20px)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '18px', color: '#fff' }}>Přihlásit se</h2>
          {error && <div style={{ marginBottom: '14px', background: 'rgba(196,18,48,0.2)', border: '1px solid rgba(196,18,48,0.4)', color: '#ff8080', fontSize: '13px', borderRadius: '10px', padding: '10px 14px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Přezdívka</label>
              <input className="input" placeholder="PepíkMessi" value={prezdivka} onChange={e => setPrezdivka(e.target.value)} autoCapitalize="none" required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Heslo</label>
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

      {/* Modal pravidla */}
      {showRules && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(4,9,28,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '20px' }} onClick={() => setShowRules(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', maxHeight: '85vh', background: '#0d1535', border: '1px solid rgba(232,160,32,0.3)', borderRadius: '24px 24px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(196,18,48,0.3), rgba(0,31,94,0.3))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={AFK_LOGO} alt="AFK" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: '#e8a020', letterSpacing: '1px' }}>PRAVIDLA SOUTĚŽE</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>Tipovačka MS 2026 · AFK Kácov</div>
                </div>
              </div>
              <button onClick={() => setShowRules(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
              <p style={{ fontSize: '13px', color: '#00b4c8', fontWeight: 600, marginBottom: '16px' }}>Sportu zdar, fotbalu zvlášť a kácovskému obzvlášť! ⚽</p>
              {RULES_SECTIONS.map((s, i) => (
                <div key={i} style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#e8a020', marginBottom: '6px' }}>{s.title}</div>
                  {s.text && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>{s.text}</p>}
                  {s.items && <ul style={{ margin: 0, paddingLeft: '4px', listStyle: 'none' }}>{s.items.map((item, j) => <li key={j} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', padding: '2px 0' }}>· {item}</li>)}</ul>}
                </div>
              ))}
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px' }}>Registrací potvrzuješ souhlas s pravidly a závazek uhradit záporný zůstatek po skončení MS.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
