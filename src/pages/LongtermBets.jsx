import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// 48 týmů MS 2026 pro výběr vítěze
const TYMY = [
  'Argentina','Austrálie','Belgie','Bosna a Hercegovina','Brazílie',
  'Česko','DR Kongo','Ekvádor','Anglie','Francie','Ghana','Haiti',
  'Chorvatsko','Írán','Irák','Japonsko','Jordánsko','Kanada','Kapverdy',
  'Kolumbie','Korea','Katar','Curaçao','Maroko','Mexiko','Německo',
  'Nizozemsko','Norsko','Nový Zéland','Panama','Paraguay','Pobřeží slonoviny',
  'Portugalsko','Rakousko','Saúdská Arábie','Senegal','Skotsko','Španělsko',
  'Švédsko','Švýcarsko','Tunisko','Türkiye','Uruguay','USA','Uzbekistán',
  'Jihoafrická republika','Alžírsko',
].sort()

const UZAVERKA_UTC = '2026-06-11T19:00:00Z'

export default function LongtermBets() {
  const { user } = useAuth()

  const [myBets,    setMyBets]    = useState({ vitez: null, strelec: null })
  const [vitez,     setVitez]     = useState('')
  const [strelec,   setStrelec]   = useState('')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState({})
  const [success,   setSuccess]   = useState({})
  const [error,     setError]     = useState({})

  const isOpen = new Date(UZAVERKA_UTC) > new Date()

  useEffect(() => {
    if (!user) return
    fetchMyBets()
  }, [user])

  async function fetchMyBets() {
    setLoading(true)
    const { data } = await supabase
      .from('longterm_bets')
      .select('*')
      .eq('user_id', user.id)
    const map = { vitez: null, strelec: null }
    ;(data ?? []).forEach(b => { map[b.typ] = b })
    setMyBets(map)
    if (map.vitez)   setVitez(map.vitez.hodnota)
    if (map.strelec) setStrelec(map.strelec.hodnota)
    setLoading(false)
  }

  async function saveBet(typ, hodnota) {
    if (!hodnota.trim()) return
    setSaving(s => ({ ...s, [typ]: true }))
    setError(e => ({ ...e, [typ]: '' }))

    try {
      const existing = myBets[typ]
      if (existing) {
        const { error: err } = await supabase
          .from('longterm_bets')
          .update({ hodnota: hodnota.trim() })
          .eq('id', existing.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('longterm_bets')
          .insert({ user_id: user.id, typ, hodnota: hodnota.trim() })
        if (err) throw err
      }
      setSuccess(s => ({ ...s, [typ]: true }))
      setTimeout(() => setSuccess(s => ({ ...s, [typ]: false })), 2000)
      await fetchMyBets()
    } catch (err) {
      if (err.message?.includes('uzaverka') || err.message?.includes('vykop')) {
        setError(e => ({ ...e, [typ]: 'Uzávěrka tipů již proběhla.' }))
      } else {
        setError(e => ({ ...e, [typ]: err.message ?? 'Chyba při ukládání.' }))
      }
    } finally {
      setSaving(s => ({ ...s, [typ]: false }))
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="text-4xl animate-bounce">⚽</div></div>
  }

  return (
    <div className="space-y-5">
      <h1 className="font-bold text-xl text-gray-900">Dlouhodobé tipy 🎯</h1>

      {/* Info */}
      <div className={`rounded-2xl px-4 py-3 text-sm ${
        isOpen
          ? 'bg-pitch-50 border border-pitch-200 text-pitch-800'
          : 'bg-red-50 border border-red-200 text-red-700'
      }`}>
        {isOpen ? (
          <>
            <p className="font-semibold">✅ Tipy jsou otevřeny</p>
            <p className="mt-0.5 text-xs">Uzávěrka: 11. 6. 2026 21:00 CEST (1. výkop Mexiko vs JAR)</p>
          </>
        ) : (
          <>
            <p className="font-semibold">🔒 Tipy jsou uzamčeny</p>
            <p className="mt-0.5 text-xs">Uzávěrka již proběhla</p>
          </>
        )}
      </div>

      {/* Vítěz MS */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-1">🏆 Vítěz MS 2026</h2>
        <p className="text-xs text-gray-500 mb-4">Cena tipu: 10 Kč · Výhru sdílí všichni, kdo trefí</p>

        {myBets.vitez && (
          <div className="mb-3 bg-blue-50 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
            Aktuální tip: {myBets.vitez.hodnota}
            {myBets.vitez.vyhra > 0 && <span className="ml-2 text-pitch-600">· Výhra: {myBets.vitez.vyhra} Kč ✅</span>}
          </div>
        )}

        {error.vitez && (
          <div className="mb-3 bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error.vitez}</div>
        )}
        {success.vitez && (
          <div className="mb-3 bg-pitch-50 text-pitch-700 text-sm rounded-xl px-3 py-2">✅ Uloženo!</div>
        )}

        {isOpen && (
          <div className="space-y-2">
            <select
              className="input"
              value={vitez}
              onChange={e => setVitez(e.target.value)}
            >
              <option value="">— vyber tým —</option>
              {TYMY.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={() => saveBet('vitez', vitez)}
              disabled={!vitez || saving.vitez}
              className="btn-primary w-full"
            >
              {saving.vitez ? 'Ukládám…' : myBets.vitez ? 'Aktualizovat' : 'Vsadit 10 Kč'}
            </button>
          </div>
        )}
      </div>

      {/* Nejlepší střelec */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-1">⚽ Nejlepší střelec</h2>
        <p className="text-xs text-gray-500 mb-4">Cena tipu: 10 Kč · Piš celé jméno hráče</p>

        {myBets.strelec && (
          <div className="mb-3 bg-blue-50 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
            Aktuální tip: {myBets.strelec.hodnota}
            {myBets.strelec.vyhra > 0 && <span className="ml-2 text-pitch-600">· Výhra: {myBets.strelec.vyhra} Kč ✅</span>}
          </div>
        )}

        {error.strelec && (
          <div className="mb-3 bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error.strelec}</div>
        )}
        {success.strelec && (
          <div className="mb-3 bg-pitch-50 text-pitch-700 text-sm rounded-xl px-3 py-2">✅ Uloženo!</div>
        )}

        {isOpen && (
          <div className="space-y-2">
            <input
              className="input"
              placeholder="např. Lionel Messi"
              value={strelec}
              onChange={e => setStrelec(e.target.value)}
            />
            <button
              onClick={() => saveBet('strelec', strelec)}
              disabled={!strelec.trim() || saving.strelec}
              className="btn-primary w-full"
            >
              {saving.strelec ? 'Ukládám…' : myBets.strelec ? 'Aktualizovat' : 'Vsadit 10 Kč'}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-center text-gray-400 pb-2">
        Bank se dělí rovným dílem mezi všechny, kdo trefí správně.<br />
        Nikdo netrefí → bank přechází do jackpotu.
      </p>
    </div>
  )
}
