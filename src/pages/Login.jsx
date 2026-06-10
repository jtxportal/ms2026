import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [prezdivka, setPrezdivka] = useState('')
  const [heslo,     setHeslo]     = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const email = `${prezdivka.trim().toLowerCase()}@tipovacka.local`
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: heslo })
      if (err) throw err
      navigate('/')
    } catch (err) {
      setError('Špatná přezdívka nebo heslo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-pitch-800 flex flex-col items-center justify-center px-4">

      <div className="mb-8 text-center">
        <div className="text-6xl mb-3">⚽</div>
        <h1 className="text-2xl font-bold text-white">Tipovačka</h1>
        <p className="text-pitch-300 text-sm mt-1">MS 2026</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Přihlásit se</h2>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Přezdívka</label>
            <input
              className="input"
              placeholder="např. Pepíkfotbal"
              value={prezdivka}
              onChange={e => setPrezdivka(e.target.value)}
              autoCapitalize="none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
            <input
              type="password"
              className="input"
              value={heslo}
              onChange={e => setHeslo(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'Přihlašuji…' : 'Přihlásit se'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Nemáš účet?{' '}
          <Link to="/registrace" className="text-pitch-600 font-semibold hover:underline">
            Zaregistruj se
          </Link>
        </p>
      </div>
    </div>
  )
}
