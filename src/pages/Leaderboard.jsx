import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatKc, formatKcAbs, formatDateShort, FAZE_LABEL } from '../lib/utils'

export default function Leaderboard() {
  const { user } = useAuth()
  const [standings, setStandings] = useState([])
  const [jackpot,   setJackpot]   = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [report,    setReport]    = useState(null)   // po finále: dlouhodobé tipy + jackpot všech
  const [openId,    setOpenId]    = useState(null)
  const [history,   setHistory]   = useState({})     // user_id -> pole sázek
  const [histLoading, setHistLoading] = useState(null)

  useEffect(() => {
    Promise.all([fetchStandings(), fetchJackpot(), fetchReport()])
      .finally(() => setLoading(false))
  }, [])

  async function fetchStandings() {
    const { data } = await supabase.rpc('get_player_standings')
    setStandings(data ?? [])
  }

  async function fetchJackpot() {
    const { data } = await supabase.from('jackpot').select('zustatek').single()
    setJackpot(data?.zustatek ?? 0)
  }

  async function fetchReport() {
    try {
      const { data } = await supabase.rpc('get_final_report')
      if (data?.ukonceno) setReport(data)
    } catch (e) { /* před finále není */ }
  }

  async function toggleHistory(p) {
    if (openId === p.id) { setOpenId(null); return }
    setOpenId(p.id)
    if (history[p.id]) return
    setHistLoading(p.id)
    const { data } = await supabase
      .from('bets')
      .select('tip_domaci, tip_hosti, castka, vyhra, matches(vykop, faze, vysledek_domaci, vysledek_hosti, vyhodnoceno, domaci:tym_domaci(nazev), hosti:tym_hosti(nazev))')
      .eq('user_id', p.id)
      .limit(1000)
    const rows = (data ?? [])
      .filter(b => b.matches)
      .sort((a, b) => new Date(a.matches.vykop) - new Date(b.matches.vykop))
    setHistory(h => ({ ...h, [p.id]: rows }))
    setHistLoading(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  function HistoryDetail({ p }) {
    const rows = history[p.id]
    if (histLoading === p.id || !rows) {
      return <p className="text-center text-xs text-gray-400 py-3">Načítám historii…</p>
    }
    const vsazeno = rows.reduce((s, b) => s + (b.castka ?? 0), 0)
    const vyhrano = rows.reduce((s, b) => s + (b.vyhra ?? 0), 0)
    // Dlouhodobé tipy + jackpot (po finále, z get_final_report)
    const lt = (report?.longterm ?? []).filter(b => b.prezdivka === p.prezdivka)
    const jp = (report?.payouts ?? []).filter(b => b.prezdivka === p.prezdivka)
    const ltVsazeno = lt.reduce((s, b) => s + (b.castka ?? 0), 0)
    const ltVyhrano = lt.reduce((s, b) => s + (b.vyhra ?? 0), 0)
    const jpVyhrano = jp.reduce((s, b) => s + (b.castka ?? 0), 0)
    const celkem = vyhrano + ltVyhrano + jpVyhrano - vsazeno - ltVsazeno

    return (
      <div className="mt-2 border-t border-gray-100 pt-2">
        <div className="max-h-72 overflow-y-auto">
          {rows.map((b, i) => {
            const m = b.matches
            const settled = m.vyhodnoceno && m.vysledek_domaci !== null
            const won = b.vyhra > 0
            return (
              <div key={i} className={`flex items-center justify-between gap-2 px-1 py-1 text-xs border-b border-gray-50 ${won ? 'bg-green-50' : ''}`}>
                <div className="min-w-0">
                  <span className="text-gray-400">{formatDateShort(m.vykop)}</span>{' '}
                  <span className="font-medium text-gray-700 truncate">{m.domaci?.nazev} – {m.hosti?.nazev}</span>{' '}
                  {settled && <span className="text-gray-500">({m.vysledek_domaci}:{m.vysledek_hosti})</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-gray-600">tip {b.tip_domaci}:{b.tip_hosti}</span>
                  <span className="text-gray-400">−{b.castka}</span>
                  <span className={won ? 'text-green-600 font-bold' : 'text-gray-300'}>{won ? `+${b.vyhra}` : '—'}</span>
                </div>
              </div>
            )
          })}
          {rows.length === 0 && <p className="text-center text-xs text-gray-400 py-2">Žádné tipy na zápasy</p>}
        </div>

        {(lt.length > 0 || jp.length > 0) && (
          <div className="mt-1 pt-1 border-t border-gray-100">
            {lt.map((b, i) => (
              <div key={i} className={`flex items-center justify-between px-1 py-1 text-xs ${b.vyhra > 0 ? 'bg-green-50' : ''}`}>
                <span className="text-gray-700">🎯 {b.typ === 'vitez' ? 'Vítěz MS' : 'Střelec'}: {b.hodnota}</span>
                <span>
                  <span className="text-gray-400">−{b.castka} </span>
                  <span className={b.vyhra > 0 ? 'text-green-600 font-bold' : 'text-gray-300'}>{b.vyhra > 0 ? `+${b.vyhra}` : '—'}</span>
                </span>
              </div>
            ))}
            {jp.map((b, i) => (
              <div key={i} className="flex items-center justify-between px-1 py-1 text-xs bg-yellow-50">
                <span className="text-gray-700">💰 Podíl z jackpotu</span>
                <span className="text-green-600 font-bold">+{b.castka}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-1 pt-2 border-t border-gray-200 flex items-center justify-between px-1 text-xs font-semibold text-gray-700">
          <span>Celkem: vsazeno {vsazeno + ltVsazeno} · vyhráno {vyhrano + ltVyhrano + jpVyhrano}</span>
          <span className={celkem > 0 ? 'text-green-600' : celkem < 0 ? 'text-red-500' : 'text-gray-400'}>
            {celkem > 0 ? '+' : ''}{celkem} Kč
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl text-gray-900">Žebříček</h1>

      {/* Jackpot */}
      <div className="bg-gradient-to-r from-gold-500 to-yellow-400 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-yellow-900 text-xs font-semibold">💰 Aktuální jackpot</p>
          <p className="text-2xl font-black text-yellow-900">{formatKcAbs(jackpot)}</p>
        </div>
        <div className="text-3xl">🏆</div>
      </div>

      {/* Tabulka */}
      {standings.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-4xl mb-3">📊</p>
          <p>Zatím žádné výsledky</p>
          <p className="text-sm mt-1">Žebříček se aktualizuje po vyhodnocení prvního zápasu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {standings.map((p) => {
            const isMe = p.id === user.id
            const pPos = Number(p.poradi)
            const medal = pPos <= 3 ? medals[pPos - 1] : null
            const open = openId === p.id

            return (
              <div
                key={p.id}
                className={`rounded-2xl px-4 py-3 ${
                  isMe
                    ? 'bg-pitch-50 border-2 border-pitch-300 shadow-sm'
                    : 'bg-white border border-gray-100 shadow-sm'
                }`}
              >
                <button onClick={() => toggleHistory(p)} className="w-full flex items-center gap-3 text-left cursor-pointer bg-transparent border-0 p-0">
                  {/* Pořadí */}
                  <div className="w-8 text-center flex-shrink-0">
                    {medal
                      ? <span className="text-xl">{medal}</span>
                      : <span className="text-sm font-bold text-gray-400">#{pPos}</span>
                    }
                  </div>

                  {/* Jméno */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {p.prezdivka}
                      {isMe && <span className="text-pitch-600 text-xs ml-1">(já)</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.pocet_tipu} tipů · vsazeno {formatKcAbs(p.vsazeno_celkem)} · vyhráno {formatKcAbs(p.vyhrano_celkem)}
                    </p>
                  </div>

                  {/* Zisk + šipka */}
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <p className={`text-base font-bold ${
                      Number(p.zisk) > 0 ? 'text-pitch-600'
                      : Number(p.zisk) < 0 ? 'text-red-500'
                      : 'text-gray-400'
                    }`}>
                      {formatKc(p.zisk)}
                    </p>
                    <span className="text-gray-300 text-xs">{open ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Historie tipů */}
                {open && <HistoryDetail p={p} />}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-center text-gray-400 pb-2">
        Zisk = vyhráno − vsazeno · klikni na jméno pro kompletní historii tipů
      </p>
    </div>
  )
}
