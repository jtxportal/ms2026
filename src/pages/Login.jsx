import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MASCOTS, AFK_LOGO } from '../lib/images'

const RULES_SECTIONS = [
  {
    title: 'âš˝ Co to je',
    text: 'JednoduchĂˇ tipovaÄŤka vĂ˝sledkĹŻ MS 2026 pro kamarĂˇdy. Nejde o sĂˇzkovou kancelĂˇĹ™ â€” vĹˇechny vloĹľenĂ© penĂ­ze se pĹ™erozdÄ›lĂ­ mezi ĂşÄŤastnĂ­ky podle ĂşspÄ›Ĺˇnosti.',
  },
  {
    title: 'đźŽŻ Jak se tipuje',
    text: 'Tipuje se pĹ™esnĂ˝ vĂ˝sledek po zĂˇkladnĂ­ hracĂ­ dobÄ›. ProdlouĹľenĂ­ ani penalty se nezapoÄŤĂ­tĂˇvajĂ­.',
  },
  {
    title: 'đź’° VĂ˝Ĺˇe sĂˇzek',
    items: ['Skupiny: 10 KÄŤ', '1/32, 1/16, osmifinĂˇle, ÄŤtvrtfinĂˇle: 20 KÄŤ', 'SemifinĂˇle: 50 KÄŤ', 'FinĂˇle: 100 KÄŤ', 'VĂ­tÄ›z MS + nejlepĹˇĂ­ stĹ™elec: 20 KÄŤ'],
  },
  {
    title: 'đźŹ¦ Bank zĂˇpasu',
    text: 'Bank = souÄŤet vĹˇech sĂˇzek na danĂ˝ zĂˇpas. RozdÄ›lĂ­ se rovnĂ˝m dĂ­lem mezi vĂ˝herce pĹ™esnĂ©ho vĂ˝sledku. Nikdo netrefĂ­ â†’ bank pĹ™echĂˇzĂ­ do jackpotu.',
  },
  {
    title: 'âśŹď¸Ź ZmÄ›na tipu',
    text: 'KaĹľdĂ˝ tip lze jednou zmÄ›nit pĹ™ed vĂ˝kopem. Po zahĂˇjenĂ­ zĂˇpasu je tip uzamÄŤen.',
  },
  {
    title: 'đźŹ† Jackpot po finĂˇle',
    text: 'NerozdÄ›lenĂ˝ jackpot se po finĂˇle rozdÄ›lĂ­: 1. mĂ­sto 50 % Â· 2. mĂ­sto 33 % Â· 3. mĂ­sto 17 %',
  },
  {
    title: 'đź’¬ Chat',
    text: 'TurnajovĂ˝ chat + chat ke kaĹľdĂ©mu zĂˇpasu. SluĹˇnĂ© chovĂˇnĂ­ prosĂ­m. Admin Venca Ĺ indĂ­lek a Bob majĂ­ prĂˇvo hrĂˇÄŤe zabanovat.',
  },
  {
    title: 'đź’ł FinanÄŤnĂ­ vyrovnĂˇnĂ­',
    text: 'RegistracĂ­ potvrzujeĹˇ, Ĺľe po skonÄŤenĂ­ MS uhradĂ­Ĺˇ zĂˇpornĂ˝ zĹŻstatek. OrganizĂˇtoĹ™i si neodeÄŤĂ­tajĂ­ ĹľĂˇdnou provizi.',
  },
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
      setError('Ĺ patnĂˇ pĹ™ezdĂ­vka nebo heslo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* PozadĂ­ */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${MASCOTS})`, backgroundSize: 'cover', backgroundPosition: 'center 20%', filter: 'brightness(0.35) saturate(1.2)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(4,9,28,0.3) 0%, rgba(4,9,28,0.7) 40%, rgba(4,9,28,0.97) 100%)' }} />

      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />

      {/* AFK KĂˇcov badge â€” vpravo nahoĹ™e */}
      <div style={{
        position: 'absolute', top: '16px', right: '16px', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      }}>
        <img src={AFK_LOGO} alt="AFK KĂˇcov" style={{
          width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover',
          border: '2px solid rgba(0,180,200,0.6)',
          boxShadow: '0 0 20px rgba(0,180,200,0.4)',
        }} />
        <div style={{
          fontSize: '9px', fontWeight: 700, color: 'rgba(0,180,200,0.9)',
          textAlign: 'center', lineHeight: 1.4, textTransform: 'uppercase',
          letterSpacing: '0.5px', maxWidth: '80px',
        }}>
          pro fanouĹˇky<br />AFK KĂˇcov
        </div>
      </div>

      {/* Obsah */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '60px', marginBottom: '8px', filter: 'drop-shadow(0 0 24px rgba(232,160,32,0.6))' }}>đźŹ†</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '36px', lineHeight: 1, textTransform: 'uppercase', background: 'linear-gradient(160deg, #fff 0%, #f5e090 50%, #e8a020 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TipovaÄŤka
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '16px', background: 'linear-gradient(90deg, #00b4c8, #00e8d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '4px', textTransform: 'uppercase', marginTop: '4px' }}>
            FIFA World Cup 2026â„˘
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginTop: '6px', textTransform: 'uppercase' }}>
            đź‡şđź‡¸ USA Â· đź‡¨đź‡¦ Kanada Â· đź‡˛đź‡˝ Mexiko
          </div>

          {/* TlaÄŤĂ­tko Pravidla */}
          <button
            onClick={() => setShowRules(true)}
            style={{
              marginTop: '14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px', padding: '6px 18px',
              color: 'rgba(255,255,255,0.7)', fontSize: '12px',
              fontWeight: 600, cursor: 'pointer', letterSpacing: '0.5px',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            đź“‹ Pravidla soutÄ›Ĺľe
          </button>
        </div>

        {/* FormulĂˇĹ™ */}
        <div style={{ width: '100%', maxWidth: '340px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px 24px', backdropFilter: 'blur(16px)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#fff' }}>PĹ™ihlĂˇsit se</h2>

          {error && (
            <div style={{ marginBottom: '16px', background: 'rgba(196,18,48,0.15)', border: '1px solid rgba(196,18,48,0.4)', color: '#ff8080', fontSize: '13px', borderRadius: '10px', padding: '10px 14px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>PĹ™ezdĂ­vka</label>
              <input className="input" placeholder="PepĂ­kMessi" value={prezdivka} onChange={e => setPrezdivka(e.target.value)} autoCapitalize="none" required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Heslo</label>
              <input className="input" type="password" value={heslo} onChange={e => setHeslo(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px', padding: '12px' }}>
              {loading ? 'PĹ™ihlaĹˇujiâ€¦' : 'PĹ™ihlĂˇsit se âšˇ'}
            </button>
          </form>

          <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            NemĂˇĹˇ ĂşÄŤet?{' '}
            <Link to="/registrace" style={{ color: '#00b4c8', fontWeight: 600, textDecoration: 'none' }}>Zaregistruj se</Link>
          </p>
        </div>
      </div>

      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />

      {/* Modal â€” Pravidla */}
      {showRules && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(4,9,28,0.92)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '20px',
        }}
          onClick={() => setShowRules(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '420px', maxHeight: '85vh',
              background: '#0d1535',
              border: '1px solid rgba(232,160,32,0.3)',
              borderRadius: '24px 24px 0 0', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header modĂˇlu */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(196,18,48,0.3), rgba(0,31,94,0.3))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={AFK_LOGO} alt="AFK" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '16px', color: '#e8a020', letterSpacing: '1px' }}>PRAVIDLA SOUTÄšĹ˝E</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>TipovaÄŤka MS 2026 Â· AFK KĂˇcov</div>
                </div>
              </div>
              <button onClick={() => setShowRules(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                âś•
              </button>
            </div>

            {/* Obsah pravidel */}
            <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
              <p style={{ fontSize: '13px', color: '#00b4c8', fontWeight: 600, marginBottom: '16px', lineHeight: 1.5 }}>
                âš˝ Sportu zdar, fotbalu zvlĂˇĹˇĹĄ a kĂˇcovskĂ©mu obzvlĂˇĹˇĹĄ!
              </p>
              {RULES_SECTIONS.map((s, i) => (
                <div key={i} style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#e8a020', marginBottom: '6px' }}>{s.title}</div>
                  {s.text && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{s.text}</p>}
                  {s.items && (
                    <ul style={{ margin: 0, paddingLeft: '4px', listStyle: 'none' }}>
                      {s.items.map((item, j) => (
                        <li key={j} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', padding: '2px 0' }}>Â· {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px', lineHeight: 1.6 }}>
                RegistracĂ­ potvrzujeĹˇ souhlas s pravidly a zĂˇvazek uhradit zĂˇpornĂ˝ zĹŻstatek po skonÄŤenĂ­ MS.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
