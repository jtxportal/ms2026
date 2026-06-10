import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime, isBeforeKickoff, FAZE_LABEL, FAZE_CENA } from '../lib/utils'

export default function BetForm() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const [match,   setMatch]   = useState(null)
  const [myBet,   setMyBet]   = useState(null)
  const [tipD,    setTipD]    = useState('')
  const [tipH,    setTipH]    = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [id, user])

  async function fetchData() {
    setLoading(true)
    const [{ data: m }, { data: b }] = await Promise.all([
      supabase
        .from('matches')
        .select(`*, domaci:tym_domaci(id,nazev,vlajka_url), hosti:tym_hosti(id,nazev,vlajka_url)`)
        .eq('id', id)
        .single(),
      supabase
        .from('bets')
        .select('*')
        .eq('match_id', id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    setMatch(m)
    setMyBet(b)
    if (b) { setTipD(String(b.tip_domaci)); setTipH(String(b.tip_hosti)) }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="text-4xl animate-bounce">⚽</div></div>
  }

  if (!match) {
    return <div className="text-center py-20 text-gray-400">Zápas nenalezen</div>
  }

  const locked = !isBeforeKickoff(match.vykop)
  const cena   = FAZE_CENA[match.faze] ?? 10

  async function handleSubmit(e) {
    e.preventDefault()
    if (locked) return
    setError('')

    const d = parseInt(tipD, 10)
    const h = parseInt(tipH, 10)
    if (isNaN(d) || isNaN(h) || d < 0 || h < 0 || d > 30 || h > 30) {
      setError('Zadej platné skóre (0–30).')
      return
    }

    setSaving(true)
    try {
      if (myBet) {
        // Aktualizace
        const { error: err } = await supabase
          .from('bets')
          .update({ tip_domaci: d, tip_hosti: h })
          .eq('id', myBet.id)
        if (err) throw err
      } else {
        // Nový tip
        const { error: err } = await supabase
          .from('bets')
          .insert({ match_id: Number(id), user_id: user.id, tip_domaci: d, tip_hosti: h })
        if (err) throw err
      }
      setDone(true)
      setTimeout(() => navigate(-1), 1200)
    } catch (err) {
      if (err.message?.includes('vykop')) {
        setError('Zápas již začal – tip nelze zadat.')
      } else {
        setError(err.message ?? 'Chyba při ukládání tipu.')
      }
    } finally {
      setSaving(false)
    }
  }

  const nazevD = match.domaci?.nazev ?? match.tym_domaci ?? '?'
  const nazevH = match.hosti?.nazev  ?? match.tym_hosti  ?? '?'
  const flagD  = match.domaci?.vlajka_url
  const flagH  = match.hosti?.vlajka_url

  return (
    <div className="max-w-sm mx-auto">

      {/* Zpět */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-5 flex items-center gap-1"
      >
        ← Zpět
      </button>

      {/* Info o zápasu */}
      <div className="card mb-5">
        <div className="text-center mb-2">
          <span className="text-xs font-semibold text-gray-500">
            {match.faze === 'skupina' ? `Skupina ${match.skupina}` : FAZE_LABEL[match.faze]}
            {' · '}
            {formatDateTime(match.vykop)} CEST
          </span>
        </div>
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            {flagD && <img src={flagD} alt={nazevD} className="w-12 h-8 object-cover rounded mx-auto mb-1 shadow-sm" />}
            <span className="text-sm font-bold">{nazevD}</span>
          </div>
          <span className="text-gray-300 text-lg font-light">vs</span>
          <div className="text-center">
            {flagH && <img src={flagH} alt={nazevH} className="w-12 h-8 object-cover rounded mx-auto mb-1 shadow-sm" />}
            <span className="text-sm font-bold">{nazevH}</span>
          </div>
        </div>
        <div className="text-center mt-2">
          <span className="badge bg-pitch-100 text-pitch-700">Cena tipu: {cena} Kč</span>
        </div>
      </div>

      {locked ? (
        <div className="card text-center text-gray-500 py-8">
          <div className="text-4xl mb-3">🔒</div>
          <p className="font-semibold">Zápas již začal</p>
          <p className="text-sm mt-1">Tipy jsou uzamčeny</p>
          {myBet && (
            <p className="mt-3 text-sm font-medium text-gray-700">
              Tvůj tip: {myBet.tip_domaci} : {myBet.tip_hosti}
            </p>
          )}
        </div>
      ) : done ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-bold text-pitch-700 text-lg">Tip uložen!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card">
          <h2 className="font-bold text-gray-900 mb-5 text-center">
            {myBet ? 'Upravit tip' : 'Zadat tip'}
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Velké vstupní pole pro skóre */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Domácí */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 text-center max-w-[80px] truncate">{nazevD}</span>
              <input
                type="number"
                min="0"
                max="30"
                className="w-20 h-20 text-4xl font-black text-center border-2 border-gray-200 rounded-2xl focus:border-pitch-500 focus:outline-none bg-white"
                value={tipD}
                onChange={e => setTipD(e.target.value)}
                required
              />
            </div>
            <span className="text-3xl text-gray-200 font-light mt-6">:</span>
            {/* Hosté */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 text-center max-w-[80px] truncate">{nazevH}</span>
              <input
                type="number"
                min="0"
                max="30"
                className="w-20 h-20 text-4xl font-black text-center border-2 border-gray-200 rounded-2xl focus:border-pitch-500 focus:outline-none bg-white"
                value={tipH}
                onChange={e => setTipH(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Rychlé předvolby */}
          <div className="mb-6">
            <p className="text-xs text-center text-gray-400 mb-2">Oblíbené výsledky</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[['1','0'],['2','1'],['2','0'],['1','1'],['0','1'],['0','2'],['3','1'],['3','0']].map(([d,h]) => (
                <button
                  key={`${d}-${h}`}
                  type="button"
                  onClick={() => { setTipD(d); setTipH(h) }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                    tipD === d && tipH === h
                      ? 'bg-pitch-600 text-white border-pitch-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-pitch-400'
                  }`}
                >
                  {d}:{h}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full text-base py-3"
          >
            {saving ? 'Ukládám…' : myBet ? `Aktualizovat tip` : `Vsadit ${cena} Kč`}
          </button>

          {myBet && (
            <p className="text-xs text-center text-gray-400 mt-2">
              Aktuální tip: {myBet.tip_domaci} : {myBet.tip_hosti}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
