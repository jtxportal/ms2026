import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TEAMS_48 = [
  {code:'ALG',nazev:'Alžírsko'},{code:'ARG',nazev:'Argentina'},{code:'AUS',nazev:'Austrálie'},
  {code:'AUT',nazev:'Rakousko'},{code:'BEL',nazev:'Belgie'},{code:'BIH',nazev:'Bosna a Hercegovina'},
  {code:'BRA',nazev:'Brazílie'},{code:'CAN',nazev:'Kanada'},{code:'CIV',nazev:'Pobřeží slonoviny'},
  {code:'COD',nazev:'DR Kongo'},{code:'COL',nazev:'Kolumbie'},{code:'CPV',nazev:'Kapverdy'},
  {code:'CRO',nazev:'Chorvatsko'},{code:'CUW',nazev:'Curaçao'},{code:'CZE',nazev:'Česko'},
  {code:'ECU',nazev:'Ekvádor'},{code:'EGY',nazev:'Egypt'},{code:'ENG',nazev:'Anglie'},
  {code:'ESP',nazev:'Španělsko'},{code:'FRA',nazev:'Francie'},{code:'GER',nazev:'Německo'},
  {code:'GHA',nazev:'Ghana'},{code:'HAI',nazev:'Haiti'},{code:'IRN',nazev:'Írán'},
  {code:'IRQ',nazev:'Irák'},{code:'JOR',nazev:'Jordánsko'},{code:'JPN',nazev:'Japonsko'},
  {code:'KOR',nazev:'Korea'},{code:'KSA',nazev:'Saúdská Arábie'},{code:'MAR',nazev:'Maroko'},
  {code:'MEX',nazev:'Mexiko'},{code:'NED',nazev:'Nizozemsko'},{code:'NOR',nazev:'Norsko'},
  {code:'NZL',nazev:'Nový Zéland'},{code:'PAN',nazev:'Panama'},{code:'PAR',nazev:'Paraguay'},
  {code:'POR',nazev:'Portugalsko'},{code:'QAT',nazev:'Katar'},{code:'RSA',nazev:'Jihoafrická republika'},
  {code:'SCO',nazev:'Skotsko'},{code:'SEN',nazev:'Senegal'},{code:'SUI',nazev:'Švýcarsko'},
  {code:'SWE',nazev:'Švédsko'},{code:'TUN',nazev:'Tunisko'},{code:'TUR',nazev:'Türkiye'},
  {code:'URU',nazev:'Uruguay'},{code:'USA',nazev:'USA'},{code:'UZB',nazev:'Uzbekistán'},
].sort((a,b) => a.nazev.localeCompare(b.nazev, 'cs'))

const UZAVERKA_UTC = '2026-06-11T19:00:00Z'

export default function LongtermBets() {
  const { user } = useAuth()

  const [myBets,   setMyBets]   = useState({ vitez: null, strelec: null })
  const [vitez,    setVitez]    = useState('')
  const [vitezQ,   setVitezQ]   = useState('')   // autocomplete query
  const [strelec,  setStrelec]  = useState('')
  const [strelecQ, setStrelecQ] = useState('')   // autocomplete query
  const [players,  setPlayers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState({})
  const [success,  setSuccess]  = useState({})
  const [error,    setError]    = useState({})

  const isOpen = new Date(UZAVERKA_UTC) > new Date()

  // Filtrované týmy pro autocomplete vítěze
  const filteredTeams = vitezQ.length > 0
    ? TEAMS_48.filter(t => t.nazev.toLowerCase().startsWith(vitezQ.toLowerCase()))
    : []

  // Filtrovaní hráči pro autocomplete střelce
  const filteredPlayers = strelecQ.length >= 2
    ? players.filter(p => p.player_name?.toLowerCase().includes(strelecQ.toLowerCase()))
    : []

  useEffect(() => {
    if (!user) return
    fetchMyBets()
    fetchPlayers()
  }, [user])

  async function fetchMyBets() {
    setLoading(true)
    const { data } = await supabase.from('longterm_bets').select('*').eq('user_id', user.id)
    const map = { vitez: null, strelec: null }
    ;(data ?? []).forEach(b => { map[b.typ] = b })
    setMyBets(map)
    if (map.vitez)   { setVitez(map.vitez.hodnota) }
    if (map.strelec) { setStrelec(map.strelec.hodnota) }
    setLoading(false)
  }

  async function fetchPlayers() {
    // Zkusit načíst hráče z DB (z match_lineups)
    const { data } = await supabase.rpc('search_players', { p_query: '' }).limit(500)
    setPlayers(data ?? [])
  }

  async function searchPlayers(query) {
    if (query.length < 2) return
    const { data } = await supabase.rpc('search_players', { p_query: query })
    setPlayers(data ?? [])
  }

  async function saveBet(typ, hodnota) {
    if (!hodnota.trim()) return
    setSaving(s => ({ ...s, [typ]: true }))
    setError(e => ({ ...e, [typ]: '' }))

    try {
      const existing = myBets[typ]
      if (existing) {
        const { error: err } = await supabase.from('longterm_bets')
          .update({ hodnota: hodnota.trim() }).eq('id', existing.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('longterm_bets')
          .insert({ user_id: user.id, typ, hodnota: hodnota.trim(), castka: 20 })
        if (err) throw err
      }
      setSuccess(s => ({ ...s, [typ]: true }))
      setTimeout(() => setSuccess(s => ({ ...s, [typ]: false })), 2000)
      await fetchMyBets()
    } catch (err) {
      setError(e => ({ ...e, [typ]: err.message ?? 'Chyba při ukládání.' }))
    } finally {
      setSaving(s => ({ ...s, [typ]: false }))
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="text-4xl animate-bounce">⚽</div></div>

  return (
    <div className="space-y-5">
      <h1 className="font-bold text-xl text-gray-900">Dlouhodobé tipy 🎯</h1>

      {/* Uzávěrka info */}
      <div className={`rounded-2xl px-4 py-3 text-sm ${isOpen ? 'bg-pitch-50 border border-pitch-200 text-pitch-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
        {isOpen ? (
          <><p className="font-semibold">✅ Tipy jsou otevřeny</p>
          <p className="mt-0.5 text-xs">Uzávěrka: 11. 6. 2026 21:00 CEST (první výkop)</p></>
        ) : (
          <><p className="font-semibold">🔒 Uzávěrka proběhla</p>
          <p className="mt-0.5 text-xs">Tipy jsou uzamčeny</p></>
        )}
      </div>

      {/* Vítěz MS */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-1">🏆 Vítěz MS 2026</h2>
        <p className="text-xs text-gray-500 mb-4">Sázka: <strong>20 Kč</strong> · Bank se dělí mezi ty, kdo trefí</p>

        {myBets.vitez && (
          <div className="mb-3 bg-blue-50 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
            Aktuální tip: <strong>{myBets.vitez.hodnota}</strong>
            {myBets.vitez.vyhra > 0 && <span className="ml-2 text-pitch-600">· Výhra: {myBets.vitez.vyhra} Kč ✅</span>}
          </div>
        )}
        {error.vitez   && <div className="mb-3 bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error.vitez}</div>}
        {success.vitez && <div className="mb-3 bg-pitch-50 text-pitch-700 text-sm rounded-xl px-3 py-2">✅ Uloženo!</div>}

        {isOpen && (
          <div className="space-y-2 relative">
            <div className="relative">
              <input
                className="input"
                placeholder="Začni psát název týmu…"
                value={vitezQ || vitez}
                onChange={e => { setVitezQ(e.target.value); setVitez('') }}
                onFocus={() => setVitezQ(vitez)}
              />
              {filteredTeams.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                  {filteredTeams.map(t => (
                    <button key={t.code} type="button"
                      onClick={() => { setVitez(t.nazev); setVitezQ('') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-pitch-50 text-sm flex items-center justify-between"
                    >
                      <span className="font-medium">{t.nazev}</span>
                      <span className="text-gray-400 text-xs">{t.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {vitez && !vitezQ && (
              <div className="bg-pitch-50 rounded-lg px-3 py-2 text-sm text-pitch-700 font-medium">
                Vybrán: {vitez}
              </div>
            )}
            <button onClick={() => saveBet('vitez', vitez)} disabled={!vitez||saving.vitez}
              className="btn-primary w-full">
              {saving.vitez ? 'Ukládám…' : myBets.vitez ? 'Aktualizovat' : 'Vsadit 20 Kč'}
            </button>
          </div>
        )}
      </div>

      {/* Nejlepší střelec */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-1">⚽ Nejlepší střelec</h2>
        <p className="text-xs text-gray-500 mb-4">Sázka: <strong>20 Kč</strong> · Piš příjmení nebo celé jméno</p>

        {myBets.strelec && (
          <div className="mb-3 bg-blue-50 rounded-xl px-3 py-2 text-sm text-blue-700 font-medium">
            Aktuální tip: <strong>{myBets.strelec.hodnota}</strong>
            {myBets.strelec.vyhra > 0 && <span className="ml-2 text-pitch-600">· Výhra: {myBets.strelec.vyhra} Kč ✅</span>}
          </div>
        )}
        {error.strelec   && <div className="mb-3 bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error.strelec}</div>}
        {success.strelec && <div className="mb-3 bg-pitch-50 text-pitch-700 text-sm rounded-xl px-3 py-2">✅ Uloženo!</div>}

        {isOpen && (
          <div className="space-y-2 relative">
            <div className="relative">
              <input
                className="input"
                placeholder="Jméno hráče (např. Schick, Mbappé…)"
                value={strelecQ || strelec}
                onChange={e => {
                  setStrelecQ(e.target.value)
                  setStrelec(e.target.value)
                  searchPlayers(e.target.value)
                }}
              />
              {filteredPlayers.length > 0 && strelecQ.length >= 2 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                  {filteredPlayers.map((p, i) => (
                    <button key={i} type="button"
                      onClick={() => { setStrelec(p.player_name); setStrelecQ('') }}
                      className="w-full text-left px-4 py-2.5 hover:bg-pitch-50 text-sm flex items-center justify-between"
                    >
                      <span className="font-medium">{p.player_name}</span>
                      <span className="text-gray-400 text-xs">{p.team_nazev}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {players.length === 0 && (
              <p className="text-xs text-gray-400">Soupisky budou dostupné před prvními zápasy — zatím zapiš jméno ručně.</p>
            )}
            <button onClick={() => saveBet('strelec', strelec)} disabled={!strelec.trim()||saving.strelec}
              className="btn-primary w-full">
              {saving.strelec ? 'Ukládám…' : myBets.strelec ? 'Aktualizovat' : 'Vsadit 20 Kč'}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-center text-gray-400 pb-2">
        Bank se dělí rovným dílem · Nikdo netrefí → bank do jackpotu
      </p>
    </div>
  )
}
