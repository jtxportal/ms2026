import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ jmeno:'', prijmeni:'', prezdivka:'', telefon:'', heslo:'', heslo2:'' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.heslo !== form.heslo2) {
      setError('Hesla se neshodují.')
      return
    }
    if (form.heslo.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků.')
      return
    }
    if (form.prezdivka.trim().length < 2) {
      setError('Přezdívka je příliš krátká.')
      return
    }

    setLoading(true)
    try {
      const email = `${form.prezdivka.trim().toLowerCase()}@tipovacka.local`
      const { error: err } = await supabase.auth.signUp({
        email,
        password: form.heslo,
        options: {
          data: {
            jmeno:     form.jmeno.trim(),
            prijmeni:  form.prijmeni.trim(),
            prezdivka: form.prezdivka.trim(),
            telefon:   form.telefon.trim(),
          }
        }
      })
      if (err) {
        if (err.message?.includes('already registered')) {
          throw new Error('Tato přezdívka je již obsazena.')
        }
        throw err
      }
      navigate('/')
    } catch (err) {
      setError(err.message ?? 'Chyba při registraci.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-pitch-800 flex flex-col items-center justify-center px-4 py-8">

      <div className="mb-6 text-center">
        <div className="text-5xl mb-2">⚽</div>
        <h1 className="text-xl font-bold text-white">Tipovačka MS 2026</h1>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Nový účet</h2>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jméno</label>
              <input className="input text-sm" placeholder="Jan" value={form.jmeno} onChange={set('jmeno')} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Příjmení</label>
              <input className="input text-sm" placeholder="Novák" value={form.prijmeni} onChange={set('prijmeni')} required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Přezdívka <span className="text-gray-400">(slouží jako přihlašovací jméno)</span></label>
            <input
              className="input text-sm"
              placeholder="PepíkMessi"
              value={form.prezdivka}
              onChange={set('prezdivka')}
              autoCapitalize="none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Telefon <span className="text-gray-400">(nepovinné)</span></label>
            <input className="input text-sm" placeholder="+420 777 123 456" value={form.telefon} onChange={set('telefon')} type="tel" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Heslo</label>
            <input type="password" className="input text-sm" value={form.heslo} onChange={set('heslo')} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Heslo znovu</label>
            <input type="password" className="input text-sm" value={form.heslo2} onChange={set('heslo2')} required />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'Registruji…' : 'Zaregistrovat se'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Máš účet?{' '}
          <Link to="/prihlasit" className="text-pitch-600 font-semibold hover:underline">
            Přihlásit se
          </Link>
        </p>
      </div>
    </div>
  )
}
