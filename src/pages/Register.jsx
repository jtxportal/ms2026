import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MASCOTS } from '../lib/images'

export default function Register() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ jmeno:'', prijmeni:'', prezdivka:'', telefon:'', heslo:'', heslo2:'' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.heslo !== form.heslo2) { setError('Hesla se neshodujĂ­.'); return }
    if (form.heslo.length < 6)      { setError('Heslo musĂ­ mĂ­t alespoĹ 6 znakĹŻ.'); return }

    setLoading(true)
    try {
      const email = `${form.prezdivka.trim().toLowerCase()}@tipovacka.local`
      const { error: err } = await supabase.auth.signUp({
        email, password: form.heslo,
        options: { data: { jmeno: form.jmeno.trim(), prijmeni: form.prijmeni.trim(), prezdivka: form.prezdivka.trim(), telefon: form.telefon.trim() } }
      })
      if (err) { if (err.message?.includes('already')) throw new Error('Tato pĹ™ezdĂ­vka je obsazena.'); throw err }
      navigate('/')
    } catch (err) {
      setError(err.message ?? 'Chyba pĹ™i registraci.')
    } finally {
      setLoading(false)
    }
  }

  const inp = (label, field, props = {}) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '5px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</label>
      <input className="input" value={form[field]} onChange={set(field)} style={{ fontSize: '14px' }} {...props} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${MASCOTS})`, backgroundSize: 'cover', backgroundPosition: 'center 20%', filter: 'brightness(0.3) saturate(1.2)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(4,9,28,0.4), rgba(4,9,28,0.98))' }} />
      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />

      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '6px' }}>âš˝</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '26px', background: 'linear-gradient(135deg, #fff, #e8a020)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            NovĂˇ registrace
          </div>
          <div style={{ fontSize: '11px', color: '#00b4c8', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '4px' }}>MS 2026</div>
        </div>

        <div style={{ width: '100%', maxWidth: '340px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px 20px', backdropFilter: 'blur(16px)' }}>
          {error && <div style={{ marginBottom: '14px', background: 'rgba(196,18,48,0.15)', border: '1px solid rgba(196,18,48,0.4)', color: '#ff8080', fontSize: '12px', borderRadius: '10px', padding: '10px 14px' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '0' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '5px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>JmĂ©no</label>
                <input className="input" value={form.jmeno} onChange={set('jmeno')} placeholder="Jan" required style={{ fontSize: '14px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '5px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>PĹ™Ă­jmenĂ­</label>
                <input className="input" value={form.prijmeni} onChange={set('prijmeni')} placeholder="NovĂˇk" required style={{ fontSize: '14px' }} />
              </div>
            </div>
            {inp('PĹ™ezdĂ­vka (pĹ™ihlaĹˇovacĂ­ jmĂ©no)', 'prezdivka', { placeholder: 'PepĂ­kMessi', autoCapitalize: 'none', required: true })}
            {inp('Telefon (nepovinnĂ©)', 'telefon', { placeholder: '+420 777 ...', type: 'tel' })}
            {inp('Heslo', 'heslo', { type: 'password', required: true })}
            {inp('Heslo znovu', 'heslo2', { type: 'password', required: true })}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px', padding: '12px', marginTop: '4px' }}>
              {loading ? 'Registrujiâ€¦' : 'Zaregistrovat se âšˇ'}
            </button>
          </form>

          <p style={{ marginTop: '14px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            MĂˇĹˇ ĂşÄŤet? <Link to="/prihlasit" style={{ color: '#00b4c8', fontWeight: 600, textDecoration: 'none' }}>PĹ™ihlĂˇsit se</Link>
          </p>
        </div>
      </div>
      <div className="rainbow-stripe" style={{ position: 'relative', zIndex: 2 }} />
    </div>
  )
}
