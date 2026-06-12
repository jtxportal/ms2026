import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MASCOTS, AFK_LOGO } from '../lib/images'

// Odstranit diakritiku a nepovolené znaky
function stripDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
}

export default function Register() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ jmeno:'', prijmeni:'', prezdivka:'', telefon:'', heslo:'', heslo2:'' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => {
      let val = e.target.value
      if (field === 'prezdivka') val = stripDiacritics(val)
      setForm(f => ({ ...f, [field]: val }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.heslo !== form.heslo2) { setError('Hesla se neshodují.'); return }
    if (form.heslo.length < 6)      { setError('Heslo musí mít alespoň 6 znaků.'); return }
    if (!form.prezdivka)            { setError('Zadej přezdívku.'); return }

    setLoading(true)
    try {
      const email = `${form.prezdivka}@ms2026.app`
      const { error: err } = await supabase.auth.signUp({
        email, password: form.heslo,
        options: { data: {
          jmeno:     form.jmeno.trim(),
          prijmeni:  form.prijmeni.trim(),
          prezdivka: form.prezdivka,
          telefon:   form.telefon.trim(),
        }}
      })
      if (err) {
        if (err.message?.includes('already')) throw new Error('Tato přezdívka je obsazena.')
        throw err
      }
      navigate('/')
    } catch (err) {
      setError(err.message ?? 'Chyba při registraci.')
    } finally {
      setLoading(false)
    }
  }

  const S = {
    card: { width: '100%', maxWidth: '340px', background: 'rgba(4,9,28,0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '24px 20px', backdropFilter: 'blur(20px)' },
    label: { display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '5px', letterSpacing: '1px', textTransform: 'uppercase' },
    row: { marginBottom: '12px' },
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${MASCOTS})`, backgroundSize: 'cover', backgroundPosition: 'center 20%', filter: 'brightness(0.4) saturate(1.2)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(4,9,28,0.2), rgba(4,9,28,0.95))' }} />
      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />

      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: '16px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <img src={AFK_LOGO} alt="AFK" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,180,200,0.7)', boxShadow: '0 0 20px rgba(0,180,200,0.4)', marginBottom: '8px' }} />
          <div style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif", fontWeight: 900, fontSize: '22px', background: 'linear-gradient(135deg, #fff, #e8a020)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Nová registrace
          </div>
          <div style={{ fontSize: '11px', color: '#00b4c8', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '4px' }}>MS 2026 · AFK Kácov</div>
        </div>

        {/* Formulář */}
        <div style={S.card}>
          {error && <div style={{ marginBottom: '14px', background: 'rgba(196,18,48,0.2)', border: '1px solid rgba(196,18,48,0.4)', color: '#ff8080', fontSize: '13px', borderRadius: '10px', padding: '10px 14px' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Jméno + příjmení */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={S.label}>Jméno</label>
                <input className="input" value={form.jmeno} onChange={set('jmeno')} placeholder="Jan" required style={{ fontSize: '14px' }} />
              </div>
              <div>
                <label style={S.label}>Příjmení</label>
                <input className="input" value={form.prijmeni} onChange={set('prijmeni')} placeholder="Novák" required style={{ fontSize: '14px' }} />
              </div>
            </div>

            {/* Přezdívka */}
            <div style={S.row}>
              <label style={S.label}>Přezdívka (přihlašovací jméno)</label>
              <input className="input" value={form.prezdivka} onChange={set('prezdivka')}
                placeholder="pepik123" autoCapitalize="none" required style={{ fontSize: '14px' }} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                Jen písmena a číslice — háčky a čárky se automaticky odstraní
              </p>
            </div>

            {/* Telefon */}
            <div style={S.row}>
              <label style={S.label}>Telefon (pro SMS upozornění)</label>
              <input className="input" value={form.telefon} onChange={set('telefon')}
                placeholder="+420 777 123 456" type="tel" style={{ fontSize: '14px' }} />
            </div>

            {/* Heslo */}
            <div style={S.row}>
              <label style={S.label}>Heslo</label>
              <input className="input" type="password" value={form.heslo} onChange={set('heslo')} required style={{ fontSize: '14px' }} />
            </div>
            <div style={{ ...S.row, marginBottom: '18px' }}>
              <label style={S.label}>Heslo znovu</label>
              <input className="input" type="password" value={form.heslo2} onChange={set('heslo2')} required style={{ fontSize: '14px' }} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ fontSize: '15px', padding: '12px' }}>
              {loading ? 'Registruji…' : 'Zaregistrovat se ⚡'}
            </button>
          </form>

          <p style={{ marginTop: '14px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Máš účet? <Link to="/prihlasit" style={{ color: '#00b4c8', fontWeight: 600, textDecoration: 'none' }}>Přihlásit se</Link>
          </p>
        </div>
      </div>
      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />
    </div>
  )
}
