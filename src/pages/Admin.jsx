import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateTime, FAZE_LABEL } from '../lib/utils'

export default function Admin() {
  const [tab,      setTab]      = useState('settle')
  const [matches,  setMatches]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [ts,       setTs]       = useState(null)

  useEffect(() => {
    fetchData()
  }, [tab])

  async function fetchData() {
    setLoading(true)
    if (tab === 'settle') {
      const { data } = await supabase
        .from('matches')
        .select(`*, domaci:tym_domaci(id,nazev), hosti:tym_hosti(id,nazev)`)
        .eq('vyhodnoceno', false)
        .lte('vykop', new Date().toISOString())
        .order('vykop')
      setMatches(data ?? [])
    } else if (tab === 'ts') {
      const { data } = await supabase.from('tournament_state').select('*').single()
      setTs(data)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <h1 className="font-bold text-xl text-gray-900">🔧 Admin panel</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'settle', label: 'Výsledky' },
          { id: 'ts',     label: 'Stav turnaje' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-pitch-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="text-4xl animate-bounce">⚽</div></div>
      ) : tab === 'settle' ? (
        <SettlePanel matches={matches} onRefresh={fetchData} />
      ) : tab === 'ts' ? (
        <TournamentStatePanel ts={ts} onRefresh={fetchData} />
      ) : null}
    </div>
  )
}

// ============================================================
// Vyhodnocení zápasů
// ============================================================
function SettlePanel({ matches, onRefresh }) {
  if (matches.length === 0) {
    return (
      <div className="card text-center text-gray-400 py-10">
        <p className="text-3xl mb-2">✅</p>
        <p>Žádný zápas čeká na výsledek</p>
        <p className="text-xs mt-1">Zde se zobrazí odehrané nevyhodnocené zápasy</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {matches.map(m => (
        <SettleCard key={m.id} match={m} onSettled={onRefresh} />
      ))}
    </div>
  )
}

function SettleCard({ match, onSettled }) {
  const [resD,    setResD]    = useState('')
  const [resH,    setResH]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const nazevD = match.domaci?.nazev ?? match.tym_domaci ?? '?'
  const nazevH = match.hosti?.nazev  ?? match.tym_hosti  ?? '?'

  async function handleSettle() {
    const d = parseInt(resD, 10)
    const h = parseInt(resH, 10)
    if (isNaN(d) || isNaN(h) || d < 0 || h < 0) {
      setError('Zadej platné skóre.')
      return
    }
    setError('')
    setSaving(true)
    try {
      // Nejprve uložit výsledek do matches
      const { error: upErr } = await supabase
        .from('matches')
        .update({ vysledek_domaci: d, vysledek_hosti: h })
        .eq('id', match.id)
      if (upErr) throw upErr

      // Pak vyhodnotit
      const { data, error: rpcErr } = await supabase.rpc('settle_match', { p_match_id: match.id })
      if (rpcErr) throw rpcErr
      setResult(data)
      setTimeout(onSettled, 2000)
    } catch (err) {
      setError(err.message ?? 'Chyba při vyhodnocení.')
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <div className="card bg-pitch-50 border border-pitch-200">
        <p className="font-bold text-pitch-700">✅ {nazevD} vs {nazevH} — vyhodnoceno</p>
        <p className="text-sm text-gray-700 mt-1">
          Bank: {result.bank} Kč · Výherců: {result.vitezove}
          {result.vitezove > 0 ? ` · Na osobu: ${result.na_osobu} Kč` : ' · Do jackpotu'}
          · Jackpot po: {result.jackpot_po} Kč
        </p>
      </div>
    )
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-900">
          {match.faze === 'skupina' ? `Sk. ${match.skupina}` : FAZE_LABEL[match.faze]}
          {' — '}{formatDateTime(match.vykop)}
        </p>
      </div>

      <p className="font-bold text-gray-900 text-center">
        {nazevD} vs {nazevH}
      </p>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}

      <div className="flex items-center justify-center gap-3">
        <input
          type="number" min="0" max="30"
          className="w-16 h-14 text-2xl font-bold text-center border-2 border-gray-200 rounded-xl focus:border-pitch-500 focus:outline-none"
          value={resD}
          onChange={e => setResD(e.target.value)}
          placeholder="0"
        />
        <span className="text-gray-300 text-xl">:</span>
        <input
          type="number" min="0" max="30"
          className="w-16 h-14 text-2xl font-bold text-center border-2 border-gray-200 rounded-xl focus:border-pitch-500 focus:outline-none"
          value={resH}
          onChange={e => setResH(e.target.value)}
          placeholder="0"
        />
      </div>

      <button
        onClick={handleSettle}
        disabled={saving || resD === '' || resH === ''}
        className="btn-primary w-full"
      >
        {saving ? 'Vyhodnocuji…' : 'Zadat výsledek a vyhodnotit'}
      </button>
    </div>
  )
}

// ============================================================
// Stav turnaje
// ============================================================
function TournamentStatePanel({ ts, onRefresh }) {
  const [vitez,    setVitez]    = useState(ts?.vitez_ms ?? '')
  const [strelec,  setStrelec]  = useState(ts?.nejlepsi_strelec ?? '')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  async function saveState() {
    setSaving(true)
    setMsg('')
    const { error } = await supabase
      .from('tournament_state')
      .update({ vitez_ms: vitez || null, nejlepsi_strelec: strelec || null })
      .eq('id', 1)
    setSaving(false)
    if (error) { setMsg('Chyba: ' + error.message); return }
    setMsg('✅ Uloženo')
    onRefresh()
  }

  async function settleLongterm() {
    if (!confirm('Opravdu vyhodnotit dlouhodobé tipy? Tato akce se nedá vrátit.')) return
    setSaving(true)
    const { data, error } = await supabase.rpc('settle_longterm')
    setSaving(false)
    if (error) { setMsg('Chyba: ' + error.message); return }
    setMsg(`✅ Dlouhodobé tipy vyhodnoceny. Vítěz: ${data.vitez_ms}, Střelec: ${data.strelec}`)
  }

  async function distributeJackpot() {
    if (!confirm('Opravdu rozdělit finální jackpot 50/33/17%? Tato akce se nedá vrátit.')) return
    setSaving(true)
    const { data, error } = await supabase.rpc('distribute_final_jackpot')
    setSaving(false)
    if (error) { setMsg('Chyba: ' + error.message); return }
    setMsg(`✅ Jackpot rozdělen. Celkem: ${data.jackpot_celkem} Kč`)
  }

  async function toggleUkonceno() {
    const { error } = await supabase
      .from('tournament_state')
      .update({ ukonceno: !ts?.ukonceno })
      .eq('id', 1)
    if (error) { setMsg('Chyba: ' + error.message); return }
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {msg && <div className="bg-pitch-50 text-pitch-700 text-sm rounded-xl px-4 py-3">{msg}</div>}

      <div className="card space-y-3">
        <h3 className="font-bold text-gray-900">Výsledky turnaje</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vítěz MS 2026</label>
          <input className="input" value={vitez} onChange={e => setVitez(e.target.value)} placeholder="např. Argentina" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nejlepší střelec</label>
          <input className="input" value={strelec} onChange={e => setStrelec(e.target.value)} placeholder="např. Lionel Messi" />
        </div>

        <button onClick={saveState} disabled={saving} className="btn-primary w-full">
          {saving ? 'Ukládám…' : 'Uložit'}
        </button>
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold text-gray-900">Stav turnaje</h3>

        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-medium text-gray-700">Turnaj ukončen</span>
          <button
            onClick={toggleUkonceno}
            className={`w-12 h-6 rounded-full transition-colors relative ${ts?.ukonceno ? 'bg-pitch-600' : 'bg-gray-200'}`}
          >
            <span className={`block w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${ts?.ukonceno ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <button
          onClick={settleLongterm}
          disabled={saving || !ts?.ukonceno}
          className="btn-secondary w-full text-sm"
        >
          Vyhodnotit dlouhodobé tipy
        </button>

        <button
          onClick={distributeJackpot}
          disabled={saving || !ts?.ukonceno}
          className="bg-gold-500 text-white font-semibold py-2 px-4 rounded-xl w-full hover:bg-gold-600 disabled:opacity-50 transition-colors text-sm"
        >
          Rozdělit finální jackpot 50/33/17 %
        </button>
      </div>
    </div>
  )
}
